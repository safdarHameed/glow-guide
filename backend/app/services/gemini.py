import json
import re

from app.core.config import get_settings
from app.core.exceptions import service_unavailable
from app.services.remote import json_request


async def generate(prompt: str, *, search: bool = False) -> tuple[dict, list[dict]]:
    settings = get_settings()
    if not settings.gemini_api_key:
        raise service_unavailable(
            "PRODUCT_SEARCH_NOT_CONFIGURED", "Product search is not configured yet. Please try again later."
        )
    body = {"contents": [{"parts": [{"text": prompt}]}], "generationConfig": {"temperature": 0.1}}
    if search:
        body["tools"] = [{"google_search": {}}]
    else:
        body["generationConfig"]["responseMimeType"] = "application/json"
    response = await json_request(
        "POST",
        f"https://generativelanguage.googleapis.com/v1beta/models/{settings.gemini_model}:generateContent",
        headers={"x-goog-api-key": settings.gemini_api_key},
        json=body,
        timeout=55,
    )
    try:
        candidate = response["candidates"][0]
        raw = "".join(p.get("text", "") for p in candidate["content"]["parts"] if not p.get("thought"))
        raw = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw.strip())
        data = json.loads(raw)
        if not isinstance(data, dict):
            raise ValueError("Expected an object")
        grounding = candidate.get("groundingMetadata", {}).get("groundingChunks", [])
        return data, grounding
    except (KeyError, IndexError, ValueError, TypeError) as exc:
        raise service_unavailable(
            "INVALID_AI_RESPONSE", "Product search returned incomplete data. Please try again."
        ) from exc
