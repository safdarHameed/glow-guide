import asyncio
import copy
import time
from datetime import UTC, date, datetime

from app.core.exceptions import service_unavailable
from app.modules.profiles.schemas import Location
from app.services.remote import json_request

# Country metadata, never weather or exchange-rate estimates.
COUNTRIES = {
    "PK": ("PKR", ["Daraz", "Naheed", "Vegas Beauty"]),
    "AE": ("AED", ["Noon", "Boots UAE", "Life Pharmacy"]),
    "GB": ("GBP", ["Boots", "Superdrug", "Lookfantastic"]),
    "US": ("USD", ["Ulta", "CVS", "Sephora"]),
    "SG": ("SGD", ["Watsons", "Guardian", "Sephora"]),
    "TR": ("TRY", ["Gratis", "Watsons"]),
    "PL": ("PLN", ["Rossmann", "Hebe", "dm"]),
}
EURO = {
    "IE",
    "HR",
    "FR",
    "DE",
    "ES",
    "IT",
    "NL",
    "PT",
    "AT",
    "BE",
    "FI",
    "GR",
    "SK",
    "SI",
    "EE",
    "LV",
    "LT",
    "CY",
    "MT",
    "LU",
}
_cache: dict[tuple, tuple[float, dict]] = {}
_reverse_lock = asyncio.Lock()
_last_reverse = 0.0


def location(data: dict) -> Location:
    code = data.get("country_code", "US").upper()
    currency, stores = COUNTRIES.get(code, ("EUR" if code in EURO else "USD", ["Local pharmacies", "Brand sites"]))
    return Location(
        id=str(data["id"]),
        name=data["name"],
        country=data.get("country", code),
        country_code=code,
        lat=data["latitude"],
        lon=data["longitude"],
        currency=currency,
        stores=stores,
    )


async def search_cities(query: str) -> list[dict]:
    if len(query.strip()) < 2:
        return []
    data = await json_request(
        "GET",
        "https://geocoding-api.open-meteo.com/v1/search",
        params={"name": query.strip(), "count": 8, "language": "en", "format": "json"},
    )
    return [location(r).model_dump(mode="json", by_alias=True) for r in data.get("results", [])]


async def reverse_city(lat: float, lon: float) -> dict:
    global _last_reverse
    key = ("reverse", round(lat, 3), round(lon, 3))
    if key in _cache and time.monotonic() - _cache[key][0] < 86400:
        return copy.deepcopy(_cache[key][1])
    async with _reverse_lock:
        await asyncio.sleep(max(0, 1.1 - (time.monotonic() - _last_reverse)))
        _last_reverse = time.monotonic()
        result = await json_request(
            "GET",
            "https://nominatim.openstreetmap.org/reverse",
            params={"lat": lat, "lon": lon, "format": "jsonv2", "zoom": 10, "accept-language": "en"},
            headers={"User-Agent": "GlowGuide/1.0 (city lookup)"},
        )
    address = result.get("address", {})
    name = address.get("city") or address.get("town") or address.get("village") or result.get("name")
    if not name:
        raise service_unavailable("LOCATION_NOT_FOUND", "We couldn't find a city here. Search for a city instead.")
    loc = location(
        {
            "id": f"geo-{lat:.3f}-{lon:.3f}",
            "name": name,
            "country": address.get("country", ""),
            "country_code": address.get("country_code", "US"),
            "latitude": lat,
            "longitude": lon,
        }
    )
    data = loc.model_dump(mode="json", by_alias=True)
    _cache[key] = (time.monotonic(), data)
    return data


def advice(city: dict, skin_type: str = "", categories: set[str] | None = None) -> list[dict]:
    categories = categories or set()
    rows = [
        (
            "uv",
            "High UV" if city["uv"] >= 6 else "Daily sun protection",
            "Use SPF 50 and reapply every 2 hours outdoors." if city["uv"] >= 6 else "Use daily sunscreen outdoors.",
            "sunscreen",
        )
    ]
    if city.get("aqi") is not None and city["aqi"] >= 100:
        rows.append(("aqi", "Smog", "Double-cleanse at night to remove particles and sunscreen.", "cleanser"))
    if city["humidity"] >= 60 and any(s in skin_type.lower() for s in ("oily", "combination")):
        rows.append(("humid", "Humid + oily skin", "Choose light gel textures.", "moisturizer"))
    if city["humidity"] <= 35:
        rows.append(("dry", "Dry air", "Choose a richer moisturizer and a hydrating layer.", "moisturizer"))
    return [
        {"key": key, "title": title, "body": body, "step": step, "inPlan": any(step in c.lower() for c in categories)}
        for key, title, body, step in rows
    ]


async def environment(city: Location, days: int = 5) -> dict:
    key = ("weather", round(city.lat, 3), round(city.lon, 3), days)
    now = time.monotonic()
    if key in _cache and now - _cache[key][0] < 3600:
        data = copy.deepcopy(_cache[key][1])
        data["city"].update(city.model_dump(mode="json", by_alias=True))
        return data
    params = {"latitude": city.lat, "longitude": city.lon, "timezone": "auto", "forecast_days": days}
    weather, air = await asyncio.gather(
        json_request(
            "GET",
            "https://api.open-meteo.com/v1/forecast",
            params={
                **params,
                "current": "temperature_2m,relative_humidity_2m,apparent_temperature",
                "hourly": "uv_index,relative_humidity_2m",
                "daily": "temperature_2m_max,uv_index_max",
            },
        ),
        json_request(
            "GET",
            "https://air-quality-api.open-meteo.com/v1/air-quality",
            params={**params, "forecast_days": min(days, 5), "current": "us_aqi,pm2_5", "hourly": "us_aqi,pm2_5"},
        ),
        return_exceptions=True,
    )
    if isinstance(weather, Exception):
        raise weather
    air = {} if isinstance(air, Exception) else air
    current, hourly, daily = weather["current"], weather["hourly"], weather["daily"]
    time_now = current["time"][:13]
    hour_idx = next((i for i, t in enumerate(hourly["time"]) if t[:13] == time_now), 0)
    uv = hourly["uv_index"][hour_idx]
    if uv is None or any(
        current.get(k) is None for k in ("temperature_2m", "apparent_temperature", "relative_humidity_2m")
    ):
        raise service_unavailable("WEATHER_MISSING", "Weather data is incomplete for this location. Try again later.")
    city_data = {
        **city.model_dump(mode="json", by_alias=True),
        "temp": current["temperature_2m"],
        "feelsLike": current["apparent_temperature"],
        "humidity": current["relative_humidity_2m"],
        "uv": uv,
        "aqi": air.get("current", {}).get("us_aqi"),
        "pm25": air.get("current", {}).get("pm2_5"),
    }
    forecast = []
    for i, day in enumerate(daily["time"]):
        indices = [n for n, t in enumerate(hourly["time"]) if t.startswith(day)]
        humid = [hourly["relative_humidity_2m"][n] for n in indices if hourly["relative_humidity_2m"][n] is not None]
        aq = [
            v
            for t, v in zip(
                air.get("hourly", {}).get("time", []), air.get("hourly", {}).get("us_aqi", []), strict=False
            )
            if t.startswith(day) and v is not None
        ]
        forecast.append(
            {
                "day": "Today" if i == 0 else date.fromisoformat(day).strftime("%a"),
                "date": day,
                "temp": daily["temperature_2m_max"][i],
                "uv": daily["uv_index_max"][i],
                "humidity": round(sum(humid) / len(humid)) if humid else None,
                "aqi": max(aq) if aq else None,
                "hourly": [
                    {"hour": t[11:16], "uv": hourly["uv_index"][n]}
                    for n, t in enumerate(hourly["time"])
                    if t.startswith(day) and hourly["uv_index"][n] is not None
                ],
            }
        )
    data = {
        "city": city_data,
        "forecast": forecast,
        "updatedAt": datetime.now(UTC).isoformat(),
        "source": "Open-Meteo / CAMS",
        "advice": advice(city_data),
    }
    if len(_cache) >= 256:
        _cache.pop(next(iter(_cache)))
    _cache[key] = (now, copy.deepcopy(data))
    return data
