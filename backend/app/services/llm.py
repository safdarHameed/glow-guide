"""HTTP clients for language models: Gemini's native API and OpenAI-compatible APIs (OpenAI, xAI Grok and
compatible endpoints). Callers get the parsed JSON reply plus the web sources the model cited."""

import json
import logging
import re
from dataclasses import dataclass
from typing import Literal
from urllib.parse import quote

import httpx

logger = logging.getLogger(__name__)

GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta"
_TIMEOUT = 55
# Web-search calls read several pages before answering.
_SEARCH_TIMEOUT = 120

Protocol = Literal["gemini", "openai"]
ErrorKind = Literal["auth", "quota", "model", "bad_request", "unavailable", "invalid_response"]

# Model ids that can't produce text replies (embeddings, speech, images, video).
_NON_TEXT = (
    "embed",
    "tts",
    "image",
    "audio",
    "whisper",
    "dall-e",
    "moderation",
    "realtime",
    "transcribe",
    "veo",
    "aqa",
)


class ProviderError(Exception):
    """Provider failures by kind; the caller decides what to tell the user. Never carries provider bodies."""

    def __init__(self, kind: ErrorKind) -> None:
        super().__init__(kind)
        self.kind = kind


@dataclass(frozen=True)
class Target:
    protocol: Protocol
    base_url: str
    api_key: str
    model: str
    # Whether search=True can use the provider's own web search tool.
    web_search: bool


def _check(response: httpx.Response) -> None:
    if response.is_success:
        return
    status = response.status_code
    logger.warning("Model provider returned HTTP %s", status)
    if status in (401, 403):
        raise ProviderError("auth")
    if status == 429:
        raise ProviderError("quota")
    if status == 404:
        raise ProviderError("model")
    if status == 400:
        text = response.text
        # Gemini reports a bad key as 400; some OpenAI-compatible servers report an unknown model as 400.
        if "API_KEY_INVALID" in text or "invalid_api_key" in text or "Incorrect API key" in text:
            raise ProviderError("auth")
        if "model_not_found" in text or "does not exist" in text:
            raise ProviderError("model")
        raise ProviderError("bad_request")
    raise ProviderError("unavailable")


async def _request(
    method: str, url: str, headers: dict, body: dict | None = None, *, seconds: float = _TIMEOUT
) -> dict:
    try:
        async with httpx.AsyncClient(timeout=seconds) as client:
            response = await client.request(method, url, headers=headers, json=body)
    except httpx.HTTPError as exc:
        raise ProviderError("unavailable") from exc
    _check(response)
    try:
        data = response.json()
    except ValueError as exc:
        raise ProviderError("invalid_response") from exc
    if not isinstance(data, dict):
        raise ProviderError("invalid_response")
    return data


def parse_json(text: str) -> dict:
    text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text.strip())
    try:
        data = json.loads(text)
    except ValueError:
        # Web-search replies sometimes wrap the object in a sentence.
        start, end = text.find("{"), text.rfind("}")
        if start < 0 or end <= start:
            raise ProviderError("invalid_response") from None
        try:
            data = json.loads(text[start : end + 1])
        except ValueError as exc:
            raise ProviderError("invalid_response") from exc
    if not isinstance(data, dict):
        raise ProviderError("invalid_response")
    return data


async def _gemini(target: Target, prompt: str, search: bool) -> tuple[dict, list[dict]]:
    body: dict = {"contents": [{"parts": [{"text": prompt}]}], "generationConfig": {"temperature": 0.1}}
    if search:
        body["tools"] = [{"google_search": {}}]
    else:
        body["generationConfig"]["responseMimeType"] = "application/json"
    response = await _request(
        "POST",
        f"{target.base_url}/models/{quote(target.model, safe='')}:generateContent",
        {"x-goog-api-key": target.api_key},
        body,
        seconds=_SEARCH_TIMEOUT if search else _TIMEOUT,
    )
    try:
        candidate = response["candidates"][0]
        raw = "".join(p.get("text", "") for p in candidate["content"]["parts"] if not p.get("thought"))
    except (KeyError, IndexError, TypeError) as exc:
        raise ProviderError("invalid_response") from exc
    grounding = candidate.get("groundingMetadata") or {}
    # Some models run Google Search without listing the pages; the queries still show the answer was searched.
    sources = grounding.get("groundingChunks") or [{"query": q} for q in grounding.get("webSearchQueries") or []]
    return parse_json(raw), sources


async def _openai(target: Target, prompt: str, search: bool) -> tuple[dict, list[dict]]:
    headers = {"Authorization": f"Bearer {target.api_key}"}
    if search and target.web_search:
        response = await _request(
            "POST",
            f"{target.base_url}/responses",
            headers,
            {"model": target.model, "input": prompt, "tools": [{"type": "web_search"}]},
            seconds=_SEARCH_TIMEOUT,
        )
        texts, sources = [], []
        for item in response.get("output") or []:
            if not isinstance(item, dict) or item.get("type") != "message":
                continue
            for part in item.get("content") or []:
                if not isinstance(part, dict) or part.get("type") != "output_text":
                    continue
                texts.append(part.get("text", ""))
                for note in part.get("annotations") or []:
                    if isinstance(note, dict) and note.get("type") == "url_citation" and note.get("url"):
                        sources.append({"web": {"uri": note["url"], "title": note.get("title", "")}})
        # xAI also lists the pages it read at the top level.
        sources += [
            {"web": {"uri": url, "title": ""}} for url in response.get("citations") or [] if isinstance(url, str)
        ]
        return parse_json("".join(texts)), sources

    body = {
        "model": target.model,
        "messages": [
            {"role": "system", "content": "Reply with one JSON object only."},
            {"role": "user", "content": prompt},
        ],
        "response_format": {"type": "json_object"},
    }
    url = f"{target.base_url}/chat/completions"
    try:
        response = await _request("POST", url, headers, body)
    except ProviderError as exc:
        if exc.kind != "bad_request":
            raise
        # Some compatible servers don't support JSON mode; the prompt already asks for JSON.
        del body["response_format"]
        response = await _request("POST", url, headers, body)
    try:
        raw = response["choices"][0]["message"]["content"] or ""
    except (KeyError, IndexError, TypeError) as exc:
        raise ProviderError("invalid_response") from exc
    return parse_json(raw), []


async def generate(target: Target, prompt: str, *, search: bool = False) -> tuple[dict, list[dict]]:
    """Returns (JSON object, sources). Sources are Gemini-style grounding chunks ([{"web": {"uri", "title"}}]),
    or [{"query": ...}] when the provider searched without listing pages. Empty means no web search happened."""
    if target.protocol == "gemini":
        return await _gemini(target, prompt, search)
    return await _openai(target, prompt, search)


async def list_models(protocol: Protocol, base_url: str, api_key: str) -> list[str]:
    """Text models the key can use. Also serves as the key check when connecting."""
    if protocol == "gemini":
        response = await _request("GET", f"{base_url}/models?pageSize=200", {"x-goog-api-key": api_key})
        names = [
            m.get("name", "").removeprefix("models/")
            for m in response.get("models") or []
            if isinstance(m, dict) and "generateContent" in m.get("supportedGenerationMethods", [])
        ]
    else:
        response = await _request("GET", f"{base_url}/models", {"Authorization": f"Bearer {api_key}"})
        names = [m.get("id") for m in response.get("data") or [] if isinstance(m, dict)]
    return sorted({n for n in names if isinstance(n, str) and n and not any(s in n.lower() for s in _NON_TEXT)})
