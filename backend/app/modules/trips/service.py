import asyncio
import calendar
from datetime import UTC, date, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppError
from app.modules.environment.service import environment
from app.modules.plans.schemas import PlanInput
from app.modules.plans.service import build, current_plan, serialize
from app.modules.profiles.schemas import Location, ProfileData
from app.modules.profiles.service import get_profile
from app.modules.trips.schemas import TripInput
from app.modules.users.models import User
from app.services.remote import json_request


async def conditions(city: Location, start: date, end: date) -> dict:
    today = datetime.now(UTC).date()
    days = (end - today).days
    if 0 <= (start - today).days and days < 16:
        env = await environment(city, days=max(days + 1, 1))
        selected = [d for d in env["forecast"] if start.isoformat() <= d["date"] <= end.isoformat()]
        source = "Forecast average for your dates"
    else:
        # A measured historical baseline; never relabel current weather as a future forecast.
        year = today.year - 1
        first = date(year, start.month, 1)
        last = date(year, start.month, calendar.monthrange(year, start.month)[1])
        response = await json_request(
            "GET",
            "https://historical-forecast-api.open-meteo.com/v1/forecast",
            params={
                "latitude": city.lat,
                "longitude": city.lon,
                "start_date": first.isoformat(),
                "end_date": last.isoformat(),
                "daily": "temperature_2m_max,uv_index_max",
                "hourly": "relative_humidity_2m",
                "timezone": "auto",
            },
        )
        daily, hourly = response["daily"], response["hourly"]
        selected = []
        for i, day in enumerate(daily["time"]):
            h = [
                v
                for t, v in zip(hourly["time"], hourly["relative_humidity_2m"], strict=False)
                if t.startswith(day) and v is not None
            ]
            selected.append(
                {
                    "temp": daily["temperature_2m_max"][i],
                    "uv": daily["uv_index_max"][i],
                    "humidity": sum(h) / len(h) if h else None,
                    "aqi": None,
                }
            )
        source = f"Typical for {start.strftime('%B')} · {year} historical baseline"
        env = {
            "city": city.model_dump(mode="json", by_alias=True),
            "source": "Open-Meteo",
            "forecast": [],
            "updatedAt": datetime.now(UTC).isoformat(),
        }
    if not selected:
        raise AppError(503, "TRIP_WEATHER_UNAVAILABLE", "Conditions are unavailable for these dates. Please try again.")
    values = {}
    for field in ("temp", "humidity", "uv", "aqi"):
        present = [d[field] for d in selected if d.get(field) is not None]
        values[field] = round(sum(present) / len(present), 1) if present else None
    if any(values[k] is None for k in ("temp", "humidity", "uv")):
        raise AppError(503, "TRIP_WEATHER_INCOMPLETE", "Conditions are incomplete for these dates. Please try again.")
    env["city"] = {**env["city"], **values, "feelsLike": values["temp"], "pm25": None}
    env["label"] = source
    return env


async def create(db: AsyncSession, user: User, payload: TripInput) -> dict:
    profile = ProfileData.model_validate((await get_profile(db, user)).data)
    if not profile.city:
        raise AppError(422, "CITY_REQUIRED", "Choose your home city before planning a trip.")
    home, dest = await asyncio.gather(
        conditions(profile.city, payload.start, payload.end),
        conditions(payload.destination, payload.start, payload.end),
    )
    shop_city = profile.city if payload.buy_at == "home" else payload.destination
    planning_env = {**dest, "city": {**dest["city"], **shop_city.model_dump(mode="json", by_alias=True)}}
    plan = await build(
        db, user, PlanInput(city=shop_city), make_current=False, env_override=planning_env, trip_type=payload.trip_type
    )
    original = await current_plan(db, user)
    original_steps = (original.data["morning"] + original.data["evening"]) if original else []
    old = {s["category"]: s["productId"] for s in original_steps}
    kit, seen = [], set()
    for step in plan.data["morning"] + plan.data["evening"]:
        if step["productId"] in seen:
            continue
        seen.add(step["productId"])
        kind = (
            "keep"
            if step["productId"] in {s["productId"] for s in original_steps}
            else "swap"
            if step["category"] in old
            else "add"
        )
        kit.append(
            {
                "kind": kind,
                "productId": step["productId"],
                "fromId": old.get(step["category"]),
                "text": f"{step['category']} · {step['reason']}",
            }
        )
    notes = []
    if payload.trip_type == "beach":
        notes.append(
            "Choose water-resistant SPF 50+ and after-sun care; confirm water resistance on the retailer label."
        )
    if payload.trip_type == "work":
        notes.append("Choose compact packaging and light textures for work days.")
    plan.name = f"{payload.destination.name} trip · {payload.start.isoformat()}"
    plan.trip = {
        **payload.model_dump(mode="json", by_alias=True),
        "home": home["city"],
        "destination": dest["city"],
        "label": dest["label"],
        "kit": kit,
        "notes": notes,
    }
    return serialize(plan)
