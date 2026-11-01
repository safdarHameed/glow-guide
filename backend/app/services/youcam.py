import base64
import binascii
import math
from urllib.parse import quote

import httpx

from app.core.config import get_settings
from app.core.exceptions import bad_request, service_unavailable
from app.services.remote import json_request, public_url

BASE_URL = "https://yce-api-01.makeupar.com"
FEATURES = {
    "moisture": ("Moisture", "Skin hydration", ["Glycerin", "Ceramides"]),
    "oiliness": ("Oiliness", "Visible shine and sebum", ["Niacinamide", "Zinc"]),
    "pore": ("Pores", "Visible pore size", ["Niacinamide", "Salicylic acid"]),
    "acne": ("Acne", "Visible blemishes", ["Salicylic acid", "Azelaic acid"]),
    "redness": ("Redness", "Visible redness", ["Centella", "Ceramides"]),
    "texture": ("Texture", "Surface smoothness", ["Gentle exfoliation"]),
    "wrinkle": ("Wrinkles", "Visible fine lines", ["Peptides", "Daily SPF"]),
    "dark_circle": ("Dark circles", "Under-eye darkness", ["Caffeine"]),
}
KEYS = {"pore": "pores", "wrinkle": "wrinkles", "dark_circle": "darkCircles"}


def headers() -> dict:
    key = get_settings().youcam_api_key
    if not key:
        raise service_unavailable("SCAN_NOT_CONFIGURED", "Skin analysis is not configured yet. Please try again later.")
    return {"Authorization": f"Bearer {key}"}


def decode_photo(photo: str) -> tuple[bytes, str]:
    try:
        prefix, encoded = photo.split(",", 1)
        mime = {"data:image/jpeg;base64": "image/jpeg", "data:image/png;base64": "image/png"}[prefix]
        if len(encoded) > 14_000_000:
            raise ValueError("Photo too large")
        raw = base64.b64decode(encoded, validate=True)
        if len(raw) > 10 * 1024 * 1024 or not raw:
            raise ValueError("Photo too large")
        if not (raw.startswith(b"\xff\xd8\xff") if mime == "image/jpeg" else raw.startswith(b"\x89PNG\r\n\x1a\n")):
            raise ValueError("Invalid image")
        return raw, mime
    except (ValueError, KeyError, binascii.Error) as exc:
        raise bad_request("INVALID_PHOTO", "Choose a JPG or PNG photo up to 10 MB.") from exc


async def create_task(photo: str) -> str:
    auth = headers()
    raw, mime = decode_photo(photo)
    result = await json_request(
        "POST",
        f"{BASE_URL}/s2s/v2.0/file",
        headers=auth,
        json={
            "files": [
                {
                    "content_type": mime,
                    "file_name": "selfie.png" if mime == "image/png" else "selfie.jpg",
                    "file_size": len(raw),
                }
            ]
        },
    )
    try:
        file = result["data"]["files"][0]
        async with httpx.AsyncClient(timeout=25) as client:
            for upload in file["requests"]:
                await public_url(upload["url"])
                response = await client.request(upload["method"], upload["url"], headers=upload["headers"], content=raw)
                response.raise_for_status()
        task = await json_request(
            "POST",
            f"{BASE_URL}/s2s/v2.1/task/skin-analysis",
            headers=auth,
            json={
                "src_file_id": file["file_id"],
                "dst_actions": [f"hd_{key}" for key in FEATURES] + ["hd_skin_type"],
                "miniserver_args": {"enable_mask_overlay": False},
                "format": "json",
            },
        )
        return task["data"]["task_id"]
    except (KeyError, IndexError, ValueError, httpx.HTTPError) as exc:
        raise service_unavailable(
            "SCAN_UPLOAD_FAILED", "Your photo could not be sent for analysis. Please try again."
        ) from exc
    finally:
        del raw


async def poll_task(task_id: str) -> dict:
    return await json_request(
        "GET", f"{BASE_URL}/s2s/v2.1/task/skin-analysis/{quote(task_id, safe='')}", headers=headers()
    )


def normalize_result(results: dict) -> tuple[dict, dict[str, str]]:
    """Accept the documented output list and HD score_info whole-region structures."""
    output = results.get("output", results)
    if isinstance(output, list):
        source = {row.get("type", ""): row for row in output if isinstance(row, dict)}
    elif isinstance(output, dict):
        source = output.get("score_info", output)
    else:
        raise ValueError("Missing skin measurements")
    metrics, masks = [], {}
    for feature, (name, meaning, helps) in FEATURES.items():
        item = source.get(f"hd_{feature}", source.get(feature, {}))
        item = item.get("whole", item)
        score = item.get("ui_score")
        if not isinstance(score, (int, float)) or not math.isfinite(score) or not 0 <= score <= 100:
            raise ValueError(f"Missing {feature} score")
        key = KEYS.get(feature, feature)
        metrics.append(
            {
                "key": key,
                "name": name,
                "value": round(score),
                "note": "YouCam cosmetic estimate",
                "meaning": f"{meaning}. Higher scores indicate better condition.",
                "helps": helps,
            }
        )
        urls = item.get("mask_urls", [])
        if urls and isinstance(urls[0], str):
            masks[key] = urls[0]
    overall = source.get("all", {}).get("score") if isinstance(source.get("all"), dict) else source.get("all")
    if overall is None:
        overall = sum(m["value"] for m in metrics) / len(metrics)
    if not isinstance(overall, (float, int)) or not math.isfinite(overall) or not 0 <= overall <= 100:
        raise ValueError("Invalid overall score")
    skin_type = source.get("hd_skin_type", source.get("skin_type", {}))
    if isinstance(skin_type, dict):
        skin_type = skin_type.get("whole", skin_type)
        skin_type = (
            skin_type.get("skin_type", skin_type.get("type", "Not available"))
            if isinstance(skin_type, dict)
            else skin_type
        )
    return {
        "overall": round(float(overall)),
        "age": source.get("skin_age"),
        "skinType": skin_type if isinstance(skin_type, str) else "Not available",
        "metrics": metrics,
        "priorities": [m["name"] for m in sorted(metrics, key=lambda m: m["value"])[:3]],
    }, masks
