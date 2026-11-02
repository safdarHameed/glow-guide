import secrets
import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Query, Request, Response
from pydantic import Field, ValidationError
from sqlalchemy import delete, select, update

from app.api.deps import CurrentUser, DbSession
from app.core.exceptions import AppError
from app.core.rate_limit import limiter
from app.core.schemas import ApiModel
from app.modules.ai.service import forget_user as forget_ai_usage
from app.modules.auth.cookies import clear_auth_cookies
from app.modules.environment import service as weather
from app.modules.plans import service as plans
from app.modules.plans.models import Plan
from app.modules.plans.schemas import DuplicateInput, PlanInput, PlanPatch
from app.modules.products import service as products
from app.modules.products.models import Product, ProductReport
from app.modules.products.schemas import SearchInput
from app.modules.profiles.schemas import Location, ProfileData
from app.modules.profiles.service import get_profile, update_profile
from app.modules.saved.models import SavedProduct
from app.modules.saved.notifications import Notification, reminders
from app.modules.saved.notifications import add as add_notification
from app.modules.scans import service as scans
from app.modules.scans.models import Scan, ScanMask
from app.modules.scans.pdf import report_pdf
from app.modules.trips import service as trips
from app.modules.trips.schemas import TripInput
from app.modules.users.models import User

router = APIRouter()


@router.get("/notifications", tags=["notifications"])
async def notifications_get(db: DbSession, user: CurrentUser):
    await reminders(db, user)
    rows = (
        await db.scalars(
            select(Notification)
            .where(Notification.user_id == user.id)
            .order_by(Notification.created_at.desc())
            .limit(100)
        )
    ).all()
    await db.commit()
    return {
        "notifications": [
            {
                "id": str(row.id),
                "kind": row.kind,
                **row.data,
                "time": row.created_at.isoformat(),
                "unread": row.read_at is None,
            }
            for row in rows
        ]
    }


@router.post("/notifications/read", status_code=204, tags=["notifications"])
async def notifications_read(db: DbSession, user: CurrentUser):
    await db.execute(update(Notification).where(Notification.user_id == user.id).values(read_at=datetime.now(UTC)))
    await db.commit()
    return Response(status_code=204)


@router.post("/environment/preview", tags=["environment"])
async def environment_preview(payload: Location, user: CurrentUser):
    return await weather.environment(payload)


class PhotoInput(ApiModel):
    photo: str = Field(max_length=14_000_100)


class ConfirmDelete(ApiModel):
    confirmation: str


class ReportInput(ApiModel):
    reason: str = Field(min_length=1, max_length=1000)


class AccountPatch(ApiModel):
    name: str = Field(min_length=1, max_length=80)


@router.patch("/account", tags=["profile"])
async def account_update(payload: AccountPatch, db: DbSession, user: CurrentUser):
    if not payload.name.strip():
        raise AppError(422, "INVALID_NAME", "Enter your name.")
    user.name = payload.name.strip()
    await db.commit()
    return {"message": "Name updated."}


@router.delete("/account", status_code=204, tags=["profile"])
async def account_delete(payload: ConfirmDelete, db: DbSession, user: CurrentUser):
    if payload.confirmation != "DELETE":
        raise AppError(422, "CONFIRMATION_REQUIRED", "Type DELETE to confirm.")
    await forget_ai_usage(db, user.id)
    await db.delete(user)
    await db.commit()
    response = Response(status_code=204)
    clear_auth_cookies(response)
    return response


@router.get("/profile", tags=["profile"])
async def profile_get(db: DbSession, user: CurrentUser):
    row = await get_profile(db, user)
    await db.commit()
    return row.data


@router.patch("/profile", tags=["profile"])
@router.put("/profile", tags=["profile"])
async def profile_update(payload: ProfileData, db: DbSession, user: CurrentUser):
    patch = payload.model_dump(mode="json", by_alias=True, exclude_unset=True)
    try:
        data = await update_profile(db, user, patch)
    except ValidationError as exc:
        raise AppError(422, "INVALID_PROFILE", "Check your profile and budget values.") from exc
    await db.commit()
    return data


@router.get("/cities/search", tags=["environment"])
async def cities_search(user: CurrentUser, q: str = Query(min_length=2, max_length=100)):
    return {"cities": await weather.search_cities(q)}


@router.get("/cities/reverse", tags=["environment"])
async def cities_reverse(user: CurrentUser, lat: float = Query(ge=-90, le=90), lon: float = Query(ge=-180, le=180)):
    return await weather.reverse_city(lat, lon)


@router.get("/environment", tags=["environment"])
async def environment_get(
    db: DbSession,
    user: CurrentUser,
    lat: float | None = Query(default=None, ge=-90, le=90),
    lon: float | None = Query(default=None, ge=-180, le=180),
):
    profile = ProfileData.model_validate((await get_profile(db, user)).data)
    if (lat is None) != (lon is None):
        raise AppError(422, "COORDINATES_REQUIRED", "Provide both latitude and longitude.")
    city = Location.model_validate(await weather.reverse_city(lat, lon)) if lat is not None else profile.city
    if city is None:
        raise AppError(422, "CITY_REQUIRED", "Choose a city to see its conditions.")
    env = await weather.environment(city)
    current = await plans.current_plan(db, user)
    categories = {s["category"] for t in ("morning", "evening") for s in current.data[t]} if current else set()
    env["advice"] = weather.advice(env["city"], profile.skin_type_override or "", categories)
    await db.commit()
    return env


@router.post("/scan", status_code=202, tags=["scans"])
@limiter.limit("10/hour")
async def scan_create(request: Request, payload: PhotoInput, db: DbSession, user: CurrentUser):
    scan = await scans.create(db, user, payload.photo)
    await db.commit()
    return scans.serialize(scan)


@router.get("/scans", tags=["scans"])
async def scan_list(db: DbSession, user: CurrentUser):
    await scans.purge_expired(db, user)
    rows = (
        await db.scalars(
            select(Scan)
            .where(Scan.user_id == user.id, Scan.status == "success", Scan.expires_at.is_(None))
            .order_by(Scan.created_at)
        )
    ).all()
    await db.commit()
    return {"scans": [scans.serialize(row) for row in rows]}


@router.get("/scan/{scan_id}", tags=["scans"])
async def scan_get(scan_id: str, db: DbSession, user: CurrentUser):
    row = await scans.find_scan(db, user, scan_id)
    await scans.poll(db, user, row)
    await db.commit()
    return scans.serialize(row)


@router.post("/scan/{scan_id}/cancel", tags=["scans"])
async def scan_cancel(scan_id: str, db: DbSession, user: CurrentUser):
    row = await scans.find_scan(db, user, scan_id)
    if row.status == "running":
        row.status = "cancelled"
    await db.commit()
    return scans.serialize(row)


@router.post("/scan/{scan_id}/viewed", status_code=204, tags=["scans"])
async def scan_viewed(scan_id: str, db: DbSession, user: CurrentUser):
    row = await scans.find_scan(db, user, scan_id)
    if row.expires_at is not None:
        await db.delete(row)
    await db.commit()
    return Response(status_code=204)


@router.get("/scan/{scan_id}/masks/{feature}", tags=["scans"])
async def mask_get(scan_id: str, feature: str, db: DbSession, user: CurrentUser):
    scan = await scans.find_scan(db, user, scan_id)
    mask = await db.get(ScanMask, (scan.id, feature))
    if mask is None:
        raise AppError(404, "MASK_NOT_FOUND", "No mask is available for this measurement.")
    return Response(content=mask.content, media_type=mask.media_type, headers={"Cache-Control": "no-store"})


@router.get("/scan/{scan_id}/pdf", tags=["scans"])
async def scan_pdf(scan_id: str, db: DbSession, user: CurrentUser):
    row = await scans.find_scan(db, user, scan_id)
    if row.status != "success":
        raise AppError(422, "SCAN_NOT_READY", "Wait for your report to finish before downloading.")
    content = report_pdf(scans.serialize(row))
    return Response(
        content=content,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="glowguide-report-{row.id}.pdf"',
            "Cache-Control": "no-store",
        },
    )


@router.delete("/scans", status_code=204, tags=["scans"])
async def scan_delete(payload: ConfirmDelete, db: DbSession, user: CurrentUser):
    if payload.confirmation != "DELETE":
        raise AppError(422, "CONFIRMATION_REQUIRED", "Type DELETE to confirm.")
    await db.execute(delete(Scan).where(Scan.user_id == user.id))
    await db.commit()
    return Response(status_code=204)


@router.post("/products/search", tags=["products"])
@limiter.limit("20/hour")
async def product_search(request: Request, payload: SearchInput, db: DbSession, user: CurrentUser):
    profile = ProfileData.model_validate((await get_profile(db, user)).data)
    city = payload.city or profile.city
    if city is None:
        raise AppError(422, "CITY_REQUIRED", "Choose a city to search its stores.")
    items = await products.search(db, user, city, profile, f"{payload.query} {payload.category or ''}")
    await db.commit()
    return {"products": items, "city": city, "updatedAt": datetime.now(UTC).isoformat()}


@router.get("/products", tags=["products"])
async def product_list(
    db: DbSession,
    user: CurrentUser,
    city_id: str | None = Query(default=None, alias="cityId"),
    category: str | None = None,
    suitable_only: bool = Query(default=False, alias="suitableOnly"),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=100),
    q: str = Query(default="", max_length=500),
):
    profile = ProfileData.model_validate((await get_profile(db, user)).data)
    stmt = select(Product).where(Product.user_id == user.id).order_by(Product.created_at.desc())
    city_id = city_id or (profile.city.id if profile.city else None)
    if city_id:
        stmt = stmt.where(Product.city_id == city_id)
    rows = (await db.scalars(stmt)).all()
    items = products.filter_products([products.apply_rules(r.data, profile) for r in rows], q)
    items = [p for p in items if (not category or p["category"] == category) and (not suitable_only or p["suitable"])]
    return {"products": items[offset : offset + limit], "total": len(items)}


@router.get("/products/{product_id}", tags=["products"])
async def product_get(product_id: uuid.UUID, db: DbSession, user: CurrentUser):
    row = await products.find_product(db, user, product_id)
    profile = ProfileData.model_validate((await get_profile(db, user)).data)
    return products.apply_rules(row.data, profile)


@router.post("/products/{product_id}/report", status_code=201, tags=["products"])
async def product_report(product_id: uuid.UUID, payload: ReportInput, db: DbSession, user: CurrentUser):
    row = await products.find_product(db, user, product_id)
    db.add(ProductReport(user_id=user.id, product_id=row.id, reason=payload.reason))
    row.data = {**row.data, "offers": [{**o, "verified": False} for o in row.data["offers"]]}
    await db.commit()
    return {"message": "Thanks. This product has been marked for re-checking."}


@router.post("/plan", status_code=201, tags=["plans"])
@limiter.limit("20/hour")
async def plan_create(request: Request, payload: PlanInput, db: DbSession, user: CurrentUser):
    plan = await plans.build(db, user, payload)
    await db.commit()
    return plans.serialize(plan)


@router.get("/plans", tags=["plans"])
async def plan_list(db: DbSession, user: CurrentUser):
    rows = (
        await db.scalars(
            select(Plan).where(Plan.user_id == user.id, Plan.saved.is_(True)).order_by(Plan.created_at.desc())
        )
    ).all()
    return {"plans": [plans.serialize(row) for row in rows]}


@router.get("/plan/{plan_id}", tags=["plans"])
@router.get("/plans/{plan_id}", tags=["plans"])
async def plan_get(plan_id: str, db: DbSession, user: CurrentUser):
    return plans.serialize(await plans.find_plan(db, user, plan_id))


@router.patch("/plans/{plan_id}", tags=["plans"])
async def plan_update(plan_id: str, payload: PlanPatch, db: DbSession, user: CurrentUser):
    row = await plans.find_plan(db, user, plan_id)
    if payload.name is not None:
        row.name = payload.name
    if payload.saved is not None:
        row.saved = payload.saved
    if payload.routine is not None:
        profile = ProfileData.model_validate((await get_profile(db, user)).data)
        row.data = {**row.data, **await plans.validate_routine(db, user, payload.routine, row.city["id"], profile)}
    if payload.is_current is True:
        if row.trip:
            raise AppError(422, "TRIP_HOME_UNCHANGED", "Trip plans cannot replace your home plan.")
        await db.execute(select(User).where(User.id == user.id).with_for_update())
        await db.execute(update(Plan).where(Plan.user_id == user.id).values(is_current=False))
        row.is_current = True
        await update_profile(db, user, {"city": row.city})
    elif payload.is_current is False:
        row.is_current = False
    await db.commit()
    return plans.serialize(row)


@router.delete("/plans/{plan_id}", status_code=204, tags=["plans"])
async def plan_delete(plan_id: str, db: DbSession, user: CurrentUser):
    row = await plans.find_plan(db, user, plan_id)
    await db.delete(row)
    await db.commit()
    return Response(status_code=204)


@router.post("/plans/{plan_id}/duplicate", status_code=201, tags=["plans"])
async def plan_duplicate(plan_id: str, payload: DuplicateInput, db: DbSession, user: CurrentUser):
    source = await plans.find_plan(db, user, plan_id)
    if not source.scan_id:
        raise AppError(
            422, "SCAN_REQUIRED", "The original scan was deleted. Take a new scan to rebuild for another city."
        )
    row = await plans.build(db, user, PlanInput(city=payload.city, scan_id=str(source.scan_id)), make_current=False)
    row.saved = True
    await db.commit()
    return plans.serialize(row)


@router.post("/plans/{plan_id}/share", tags=["plans"])
async def plan_share(plan_id: str, db: DbSession, user: CurrentUser):
    row = await plans.find_plan(db, user, plan_id)
    row.share_token = row.share_token or secrets.token_urlsafe(32)
    await db.commit()
    return {"url": f"/shared/plan/{row.share_token}"}


@router.get("/shared/plans/{token}", tags=["plans"])
async def shared_plan(token: str, db: DbSession):
    row = await db.scalar(select(Plan).where(Plan.share_token == token))
    if not row:
        raise AppError(404, "PLAN_NOT_FOUND", "This shared plan was not found.")
    # Only the chosen routine/products are public: no owner, scan, goals, coordinates or settings.
    return {"name": row.name, "city": {"name": row.city["name"], "currency": row.city["currency"]}, **row.data}


@router.post("/trip", status_code=201, tags=["trips"])
@limiter.limit("20/hour")
async def trip_create(request: Request, payload: TripInput, db: DbSession, user: CurrentUser):
    row = await trips.create(db, user, payload)
    await db.commit()
    return row


@router.get("/saved", tags=["saved"])
async def saved_get(db: DbSession, user: CurrentUser):
    rows = (await db.scalars(select(SavedProduct).where(SavedProduct.user_id == user.id))).all()
    return {"wishlist": [str(row.product_id) for row in rows]}


@router.put("/saved/{product_id}", status_code=204, tags=["saved"])
async def saved_add(product_id: uuid.UUID, db: DbSession, user: CurrentUser):
    await products.find_product(db, user, product_id)
    await db.execute(select(User).where(User.id == user.id).with_for_update())
    if await db.get(SavedProduct, (user.id, product_id)) is None:
        db.add(SavedProduct(user_id=user.id, product_id=product_id))
    await db.commit()
    return Response(status_code=204)


@router.delete("/saved/{product_id}", status_code=204, tags=["saved"])
async def saved_delete(product_id: uuid.UUID, db: DbSession, user: CurrentUser):
    await db.execute(delete(SavedProduct).where(SavedProduct.user_id == user.id, SavedProduct.product_id == product_id))
    await db.commit()
    return Response(status_code=204)


@router.get("/profile/export", tags=["profile"])
async def export_data(db: DbSession, user: CurrentUser):
    await scans.purge_expired(db, user)
    profile = (await get_profile(db, user)).data
    history = (await db.scalars(select(Scan).where(Scan.user_id == user.id, Scan.status == "success"))).all()
    routines = (await db.scalars(select(Plan).where(Plan.user_id == user.id))).all()
    await db.commit()
    return {
        "account": {"id": str(user.id), "name": user.name, "email": user.email},
        "profile": profile,
        "scans": [scans.serialize(row) for row in history],
        "plans": [plans.serialize(row) for row in routines],
        **await saved_get(db, user),
    }


@router.get("/dashboard", tags=["dashboard"])
async def dashboard(db: DbSession, user: CurrentUser):
    profile = ProfileData.model_validate((await get_profile(db, user)).data)
    await scans.purge_expired(db, user)
    scan = await db.scalar(
        select(Scan).where(Scan.user_id == user.id, Scan.status == "success").order_by(Scan.created_at.desc()).limit(1)
    )
    plan = await plans.current_plan(db, user)
    env, env_error = None, None
    if profile.city:
        try:
            env = await weather.environment(profile.city)
        except AppError as exc:
            env_error = exc.message
    outdated = bool(
        plan
        and (
            profile.plan_outdated
            or plan.city["id"] != (profile.city.id if profile.city else None)
            or (env and plans.weather_changed(plan.environment, env["city"]))
        )
    )
    wishlist = await saved_get(db, user)
    if outdated and profile.notifications.uv and profile.city and env:
        await db.execute(select(User).where(User.id == user.id).with_for_update())
        await add_notification(
            db,
            user,
            f"weather-{profile.city.id}-{datetime.now(UTC).date()}",
            "weather",
            f"Conditions changed in {profile.city.name}",
            "Review your plan for today's conditions.",
        )
    await db.commit()
    return {
        "profile": profile,
        "scan": scans.serialize(scan) if scan else None,
        "plan": plans.serialize(plan) if plan else None,
        "environment": env,
        "environmentError": env_error,
        "planOutdated": outdated,
        **wishlist,
    }
