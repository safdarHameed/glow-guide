import base64
import uuid
from datetime import UTC, datetime, timedelta

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import func, select

from app.db.session import SessionLocal
from app.main import app
from app.modules.environment import service as environment
from app.modules.plans import service as plans
from app.modules.plans.models import Plan
from app.modules.products.models import Product
from app.modules.products.service import apply_rules
from app.modules.profiles.schemas import ProfileData
from app.modules.scans import service as scans
from app.modules.scans.models import Scan, ScanMask
from app.modules.trips import service as trips
from app.modules.users.models import User
from app.services import youcam
from tests.conftest import signup

CITY = {
    "id": "lahore",
    "name": "Lahore",
    "country": "Pakistan",
    "countryCode": "PK",
    "lat": 31.55,
    "lon": 74.34,
    "currency": "PKR",
    "stores": ["Test store"],
}
DEST = {**CITY, "id": "karachi", "name": "Karachi", "lat": 24.86, "lon": 67.01}
PNG = b"\x89PNG\r\n\x1a\nfixture"
PHOTO = "data:image/png;base64," + base64.b64encode(PNG).decode()


def weather(city):
    return {
        "city": {**city, "temp": 28, "feelsLike": 30, "humidity": 65, "uv": 8, "aqi": 120, "pm25": 30},
        "updatedAt": datetime.now(UTC).isoformat(),
        "forecast": [],
        "source": "Test provider",
        "advice": [],
    }


def result():
    return {
        "output": [
            {"type": f"hd_{key}", "ui_score": 60 + i, "mask_urls": ["https://masks.example/test.png"]}
            for i, key in enumerate(youcam.FEATURES)
        ]
    }


def product(pid, category="Cleansers", price=100, ingredient="Glycerin"):
    return {
        "id": str(pid),
        "brand": "Test",
        "name": f"Product {pid}",
        "category": category,
        "size": "100 ml",
        "texture": "Gel",
        "tags": [],
        "ingredients": [{"name": ingredient, "tone": "neutral", "note": "Label"}],
        "ingredientsConfirmed": True,
        "offers": [
            {
                "store": "Test store",
                "price": price,
                "currency": "PKR",
                "url": f"https://store.example/products/{pid}",
                "verified": True,
                "checked": "now",
                "delivery": "2 days",
            }
        ],
        "match": 80,
        "why": [],
        "suitable": True,
        "rating": 0,
        "reviews": "Not available",
    }


@pytest.fixture
async def seeded(client, monkeypatch):
    body = await signup(client)
    user_id = uuid.UUID(body["user"]["id"])
    saved = await client.patch(
        "/api/profile",
        json={"city": CITY, "scanConsent": True, "avoid": ["Fragrance"], "budgetMax": 1000, "onboarding": "done"},
    )
    assert saved.status_code == 200
    ids = [uuid.uuid4() for _ in range(5)]
    async with SessionLocal() as db:
        scan = Scan(
            user_id=user_id,
            task_id="test-task",
            status="success",
            city=CITY,
            report={
                **youcam.normalize_result(result())[0],
                "masks": {},
                "date": "Oct 31",
                "time": "12:00",
                "change": 0,
            },
        )
        db.add(scan)
        for i, (category, price, ingredient) in enumerate(
            [
                ("Cleansers", 100, "Glycerin"),
                ("Moisturizers", 200, "Glycerin"),
                ("Sunscreens", 300, "Zinc oxide"),
                ("Serums", 500, "Glycerin"),
                ("Moisturizers", 10, "Parfum"),
            ]
        ):
            payload = product(ids[i], category, price, ingredient)
            db.add(
                Product(
                    id=ids[i], user_id=user_id, city_id=CITY["id"], source_url=payload["offers"][0]["url"], data=payload
                )
            )
        await db.commit()
        scan_id = str(scan.id)

    async def fake_weather(city, days=5):
        return weather(city.model_dump(mode="json", by_alias=True))

    async def fake_rank(*args, **kwargs):
        return {
            "rankings": [
                {"id": str(pid), "score": 95 - i, "reason": "Selected for humidity 65%"} for i, pid in enumerate(ids)
            ]
        }, []

    monkeypatch.setattr(environment, "environment", fake_weather)
    monkeypatch.setattr(plans, "environment", fake_weather)
    monkeypatch.setattr(plans, "generate", fake_rank)
    return {"userId": user_id, "scanId": scan_id, "ids": [str(pid) for pid in ids]}


async def test_protected_application_endpoints_require_login(client):
    for method, path, body in [
        ("GET", "/api/profile", None),
        ("GET", "/api/dashboard", None),
        ("GET", "/api/plans", None),
        ("GET", "/api/scans", None),
        ("GET", "/api/products", None),
        ("POST", "/api/scan", {"photo": PHOTO}),
        ("POST", "/api/plan", {}),
    ]:
        response = await client.request(method, path, json=body)
        assert response.status_code == 401, response.text


async def test_profile_onboarding_validation_and_persistence(client):
    await signup(client)
    initial = (await client.get("/api/profile")).json()
    assert initial["city"] is None and initial["concerns"] == [] and initial["budgetMax"] is None
    assert (await client.patch("/api/profile", json={"concerns": ["a", "b", "c", "d"]})).status_code == 422
    assert (await client.patch("/api/profile", json={"budgetMin": 100, "budgetMax": 50})).status_code == 422
    response = await client.patch("/api/profile", json={"city": CITY, "onboarding": "done", "budgetMax": 500})
    assert response.status_code == 200
    assert (await client.get("/api/auth/me")).json()["user"]["onboardingCompleted"]
    assert (await client.get("/api/profile")).json()["city"]["id"] == CITY["id"]


async def test_scan_consent_status_real_metrics_and_no_selfie_storage(client, monkeypatch):
    await signup(client)
    assert (await client.post("/api/scan", json={"photo": PHOTO})).json()["error"]["code"] == "CONSENT_REQUIRED"
    await client.patch("/api/profile", json={"city": CITY, "scanConsent": True})

    async def create(photo):
        assert photo == PHOTO
        return "provider-task"

    async def poll(task):
        assert task == "provider-task"
        return {"data": {"task_status": "success", "results": result()}}

    async def mask(url):
        return PNG, "image/png"

    monkeypatch.setattr(youcam, "create_task", create)
    monkeypatch.setattr(youcam, "poll_task", poll)
    monkeypatch.setattr(scans, "download", mask)
    created = await client.post("/api/scan", json={"photo": PHOTO})
    assert created.status_code == 202
    sid = created.json()["id"]
    report = (await client.get(f"/api/scan/{sid}")).json()
    assert report["status"] == "success" and len(report["metrics"]) == 8
    assert report["metrics"][0]["value"] == 60
    assert "photo" not in report and "provider-task" not in str(report)
    mask_response = await client.get(report["masks"]["pores"])
    assert mask_response.content == PNG and mask_response.headers["cache-control"] == "no-store"
    assert (await client.get("/api/scans")).json()["scans"][0]["id"] == sid
    assert not {"photo", "selfie", "raw_image"} & set(Scan.__table__.columns.keys())


async def test_cancel_and_timeout_do_not_create_successful_reports(client, seeded, monkeypatch):
    async with SessionLocal() as db:
        task = Scan(user_id=seeded["userId"], task_id="pending", city=CITY)
        db.add(task)
        await db.commit()
        sid = str(task.id)
    cancelled = await client.post(f"/api/scan/{sid}/cancel")
    assert cancelled.json()["status"] == "cancelled"
    assert (await client.get(f"/api/scan/{sid}")).json()["status"] == "cancelled"
    async with SessionLocal() as db:
        task = Scan(
            user_id=seeded["userId"], task_id="slow", city=CITY, created_at=datetime.now(UTC) - timedelta(seconds=61)
        )
        db.add(task)
        await db.commit()
        sid = str(task.id)
    assert (await client.get(f"/api/scan/{sid}")).json()["status"] == "timeout"


async def test_plan_filter_budget_owned_dedup_and_current_state(client, seeded):
    await client.patch("/api/profile", json={"owned": [seeded["ids"][0]], "budgetMax": 600})
    response = await client.post("/api/plan", json={})
    assert response.status_code == 201, response.text
    plan = response.json()
    assert plan["total"] == 500  # shared AM/PM products bought once, owned cleanser costs zero
    assert seeded["ids"][4] not in {s["productId"] for s in plan["morning"] + plan["evening"]}
    assert any(s.get("owned") for s in plan["morning"])
    assert plan["notes"]  # serum is outside whole-routine budget
    assert (await client.get("/api/plan/current")).json()["id"] == plan["id"]
    again = await client.post("/api/plan", json={})
    assert again.status_code == 201
    async with SessionLocal() as db:
        assert await db.scalar(select(func.count()).select_from(Plan).where(Plan.is_current.is_(True))) == 1


async def test_plan_crud_wishlist_export_and_public_share(client, seeded):
    plan = (await client.post("/api/plan", json={})).json()
    pid = plan["id"]
    saved = await client.patch(f"/api/plans/{pid}", json={"saved": True, "name": "My routine"})
    assert saved.status_code == 200
    assert (await client.get("/api/plans")).json()["plans"][0]["name"] == "My routine"
    assert (await client.put(f"/api/saved/{seeded['ids'][0]}")).status_code == 204
    assert (await client.put(f"/api/saved/{seeded['ids'][0]}")).status_code == 204
    assert (await client.get("/api/saved")).json()["wishlist"] == [seeded["ids"][0]]
    exported = (await client.get("/api/profile/export")).json()
    assert exported["plans"][0]["id"] == pid and exported["scans"][0]["id"] == seeded["scanId"]
    token = (await client.post(f"/api/plans/{pid}/share")).json()["url"].rsplit("/", 1)[1]
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as public:
        shared = await public.get(f"/api/shared/plans/{token}")
        assert shared.status_code == 200
        assert not {"userId", "scanId", "profile", "lat", "lon"} & set(shared.json())
    assert (await client.delete(f"/api/saved/{seeded['ids'][0]}")).status_code == 204
    assert (await client.delete(f"/api/plans/{pid}")).status_code == 204
    assert (await client.get(f"/api/plans/{pid}")).status_code == 404


async def test_cross_user_access_is_rejected(client, seeded):
    pid = (await client.post("/api/plan", json={})).json()["id"]
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as other:
        await signup(other, email="other@example.com")
        for path in [f"/api/plan/{pid}", f"/api/scan/{seeded['scanId']}", f"/api/products/{seeded['ids'][0]}"]:
            assert (await other.get(path)).status_code == 404
        assert (await other.delete(f"/api/plans/{pid}")).status_code == 404
        assert (await other.put(f"/api/saved/{seeded['ids'][0]}")).status_code == 404
        assert (await other.get("/api/profile")).json()["city"] is None


async def test_deleted_scans_remove_masks_but_keep_plans(client, seeded):
    pid = (await client.post("/api/plan", json={})).json()["id"]
    async with SessionLocal() as db:
        db.add(ScanMask(scan_id=uuid.UUID(seeded["scanId"]), feature="pores", content=PNG, media_type="image/png"))
        await db.commit()
    assert (await client.request("DELETE", "/api/scans", json={"confirmation": "no"})).status_code == 422
    assert (await client.request("DELETE", "/api/scans", json={"confirmation": "DELETE"})).status_code == 204
    assert (await client.get(f"/api/plan/{pid}")).json()["scanDeleted"] is True
    async with SessionLocal() as db:
        assert await db.scalar(select(func.count()).select_from(ScanMask)) == 0


async def test_trip_and_city_changes_preserve_skin_and_home_plan(client, seeded, monkeypatch):
    pid = (await client.post("/api/plan", json={})).json()["id"]

    async def conditions(city, start, end):
        return {**weather(city.model_dump(mode="json", by_alias=True)), "label": "Forecast average for your dates"}

    monkeypatch.setattr(trips, "conditions", conditions)
    response = await client.post(
        "/api/trip",
        json={"destination": DEST, "start": "2026-11-05", "end": "2026-11-10", "tripType": "beach", "buyAt": "home"},
    )
    assert response.status_code == 201, response.text
    assert response.json()["trip"]["destination"]["id"] == DEST["id"]
    assert (await client.get("/api/plan/current")).json()["id"] == pid
    assert (await client.get("/api/profile")).json()["city"]["id"] == CITY["id"]
    await client.patch("/api/profile", json={"city": DEST})
    dashboard = (await client.get("/api/dashboard")).json()
    assert dashboard["scan"]["id"] == seeded["scanId"] and dashboard["planOutdated"]


async def test_editing_validates_owner_city_ingredients_and_category(client, seeded):
    plan = (await client.post("/api/plan", json={})).json()
    routine = {"morning": plan["morning"], "evening": plan["evening"]}
    routine["morning"][0]["productId"] = seeded["ids"][4]
    assert (await client.patch(f"/api/plans/{plan['id']}", json={"routine": routine})).json()["error"][
        "code"
    ] == "UNSUITABLE_PRODUCT"
    routine["morning"][0]["productId"] = seeded["ids"][1]
    assert (await client.patch(f"/api/plans/{plan['id']}", json={"routine": routine})).json()["error"][
        "code"
    ] == "WRONG_CATEGORY"


async def test_delete_account_cascades_and_revokes_session(client, seeded):
    await client.post("/api/plan", json={})
    assert (await client.request("DELETE", "/api/account", json={"confirmation": "DELETE"})).status_code == 204
    assert (await client.get("/api/auth/me")).status_code == 401
    async with SessionLocal() as db:
        for model in (User, Scan, Product, Plan):
            assert await db.scalar(select(func.count()).select_from(model)) == 0


async def test_private_report_excluded_from_history_and_removed_after_view(client, seeded):
    await client.patch("/api/profile", json={"keepScanHistory": False})
    async with SessionLocal() as db:
        row = await db.get(Scan, uuid.UUID(seeded["scanId"]))
        row.expires_at = datetime.now(UTC) + timedelta(minutes=15)
        await db.commit()
    assert (await client.get("/api/scans")).json()["scans"] == []
    assert (await client.get(f"/api/scan/{seeded['scanId']}")).status_code == 200
    assert (await client.post(f"/api/scan/{seeded['scanId']}/viewed")).status_code == 204
    assert (await client.get(f"/api/scan/{seeded['scanId']}")).status_code == 404


async def test_report_pdf_is_an_authenticated_download(client, seeded):
    response = await client.get(f"/api/scan/{seeded['scanId']}/pdf")
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.content.startswith(b"%PDF-")
    assert "attachment" in response.headers["content-disposition"]


async def test_retailer_verification_discards_ai_ingredient_claims(monkeypatch):
    from app.modules.products import service
    from app.modules.products.schemas import ProductData

    data = product(uuid.uuid4())
    data["ingredients"] = [{"name": "Glycerin"}]
    data["ingredientsConfirmed"] = True
    data["offers"][0]["verified"] = True
    page = (
        '<script type="application/ld+json">'
        + __import__("json").dumps(
            {
                "@type": "Product",
                "name": data["name"],
                "ingredients": "Water, Glycerin, Parfum",
                "offers": {"price": 100, "priceCurrency": "PKR", "availability": "https://schema.org/InStock"},
            }
        )
        + "</script>"
    )

    async def download(*args, **kwargs):
        return page.encode(), "text/html"

    monkeypatch.setattr(service, "download", download)
    verified = await service.verify(ProductData.model_validate(data))
    assert verified.source_confirmed and verified.offers[0].verified
    ruled = service.apply_rules(verified.model_dump(mode="json", by_alias=True), ProfileData(avoid=["Fragrance"]))
    assert not ruled["suitable"]  # full source list reveals Parfum omitted by the AI


async def test_budget_converts_when_city_currency_changes(client, seeded, monkeypatch):
    from app.modules.profiles import service

    async def rate(source, target):
        assert source == "PKR" and target == "AED"
        return 0.01

    monkeypatch.setattr(service, "exchange_rate", rate)
    response = await client.patch("/api/profile", json={"city": {**DEST, "currency": "AED", "countryCode": "AE"}})
    assert response.json()["budgetMax"] == 10


async def test_open_meteo_caches_weather_and_allows_missing_air_data(monkeypatch):
    from app.core.exceptions import service_unavailable
    from app.modules.profiles.schemas import Location

    environment._cache.clear()
    calls = []

    async def request(method, url, **kwargs):
        calls.append(url)
        if "air-quality" in url:
            raise service_unavailable("TEST", "No air data")
        return {
            "current": {
                "time": "2026-10-31T12:00",
                "temperature_2m": 28,
                "apparent_temperature": 30,
                "relative_humidity_2m": 65,
            },
            "hourly": {"time": ["2026-10-31T12:00"], "uv_index": [8], "relative_humidity_2m": [65]},
            "daily": {"time": ["2026-10-31"], "temperature_2m_max": [30], "uv_index_max": [9]},
        }

    monkeypatch.setattr(environment, "json_request", request)
    first = await environment.environment(Location.model_validate(CITY))
    assert first["city"]["aqi"] is None and first["city"]["uv"] == 8
    first["city"]["temp"] = 999
    second = await environment.environment(Location.model_validate(CITY))
    assert second["city"]["temp"] == 28 and len(calls) == 2
    environment._cache.clear()


def test_hd_whole_scores_and_rule_boundaries():
    source = {f"hd_{key}": {"whole": {"ui_score": 72}} for key in youcam.FEATURES}
    source["all"] = {"score": 74}
    report, _ = youcam.normalize_result({"output": source})
    assert report["overall"] == 74 and len(report["metrics"]) == 8
    assert not apply_rules(product(uuid.uuid4(), ingredient="Parfum"), ProfileData(avoid=["Fragrance"]))["suitable"]
    assert plans.weather_changed({"uv": 5, "aqi": None}, {"uv": 6, "aqi": None})
    assert not plans.weather_changed({"uv": 6, "aqi": 120}, {"uv": 7, "aqi": 130})
    assert any(row["key"] == "dry" for row in environment.advice({"uv": 2, "humidity": 35, "aqi": None}))
