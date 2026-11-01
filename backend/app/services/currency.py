import math
import time

from app.core.exceptions import service_unavailable
from app.services.remote import json_request

_rates: dict[str, tuple[float, dict]] = {}


async def exchange_rate(source: str, target: str) -> float:
    if source == target:
        return 1
    if source not in _rates or time.monotonic() - _rates[source][0] >= 86400:
        response = await json_request("GET", f"https://open.er-api.com/v6/latest/{source}")
        if response.get("result") != "success":
            raise service_unavailable("CURRENCY_UNAVAILABLE", "Budget conversion is unavailable. Please try again.")
        _rates[source] = (time.monotonic(), response.get("rates", {}))
    rate = _rates[source][1].get(target)
    if not isinstance(rate, (float, int)) or not math.isfinite(rate) or rate <= 0:
        raise service_unavailable("CURRENCY_UNAVAILABLE", "This currency is not supported for budget conversion.")
    return rate
