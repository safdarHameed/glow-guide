import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app.core.config import get_settings
from app.core.exceptions import AppError
from app.db.session import SessionLocal
from app.modules.ai import service
from app.modules.ai.models import AiConnection
from app.modules.users.models import User
from app.services.llm import ProviderError, parse_json
from tests.conftest import signup


@pytest.fixture
def calls(monkeypatch: pytest.MonkeyPatch) -> list:
    """Stubs every provider call; records the target each request was sent to."""
    seen: list = []

    async def fake_generate(target, prompt, *, search=False):
        seen.append(target)
        return {"ok": True}, []

    monkeypatch.setattr(service.llm, "generate", fake_generate)
    monkeypatch.setattr(get_settings(), "gemini_api_key", "free-tier-key")
    monkeypatch.setattr(get_settings(), "free_ai_daily_limit", 2)
    return seen


async def _user(email: str = "ayesha@example.com") -> User:
    async with SessionLocal() as db:
        return await db.scalar(select(User).where(User.email == email))


async def test_free_tier_counts_requests_and_stops_at_the_daily_limit(client: AsyncClient, calls: list) -> None:
    await signup(client)
    user = await _user()

    status = (await client.get("/api/ai/status")).json()
    assert status["active"]["tier"] == "free"
    assert status["free"] | {"resetsAt": None} == {
        "available": True,
        "model": get_settings().gemini_model,
        "used": 0,
        "limit": 2,
        "remaining": 2,
        "resetsAt": None,
    }

    await service.generate(user, "rank")
    await service.generate(user, "rank")
    with pytest.raises(AppError) as exc:
        await service.generate(user, "rank")
    assert exc.value.status_code == 429 and exc.value.code == "AI_FREE_LIMIT_REACHED"
    assert [t.api_key for t in calls] == ["free-tier-key", "free-tier-key"]

    free = (await client.get("/api/ai/status")).json()["free"]
    assert (free["used"], free["remaining"]) == (2, 0)


async def test_connected_model_is_used_instead_of_free_and_key_stays_secret(client: AsyncClient, calls: list) -> None:
    await signup(client)
    response = await client.put(
        "/api/ai/connection", json={"provider": "openai", "model": "gpt-test", "apiKey": "sk-secret-1234"}
    )
    assert response.status_code == 200, response.text

    status_response = await client.get("/api/ai/status")
    assert "sk-secret" not in status_response.text
    active = status_response.json()["active"]
    assert active | {"providerName": None} == {
        "tier": "own",
        "provider": "openai",
        "providerName": None,
        "model": "gpt-test",
        "keyHint": "1234",
        "baseUrl": None,
        "webSearch": True,
        "needsReconnect": False,
    }
    async with SessionLocal() as db:
        row = await db.scalar(select(AiConnection))
    assert "sk-secret" not in row.api_key_encrypted

    user = await _user()
    for _ in range(3):  # beyond the free limit: own models aren't counted
        await service.generate(user, "rank")
    assert calls[-1].api_key == "sk-secret-1234" and calls[-1].base_url == "https://api.openai.com/v1"
    assert (await client.get("/api/ai/status")).json()["free"]["used"] == 0

    # Changing only the model keeps the stored key.
    assert (
        await client.put("/api/ai/connection", json={"provider": "openai", "model": "gpt-other"})
    ).status_code == 200
    await service.generate(user, "rank")
    assert (calls[-1].model, calls[-1].api_key) == ("gpt-other", "sk-secret-1234")

    assert (await client.delete("/api/ai/connection")).status_code == 204
    assert (await client.get("/api/ai/status")).json()["active"]["tier"] == "free"


async def test_connect_reports_a_rejected_key_on_the_field(
    client: AsyncClient, calls: list, monkeypatch: pytest.MonkeyPatch
) -> None:
    async def rejected(*args, **kwargs):
        raise ProviderError("auth")

    monkeypatch.setattr(service.llm, "generate", rejected)
    await signup(client)
    response = await client.put("/api/ai/connection", json={"provider": "xai", "model": "grok-x", "apiKey": "bad"})
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "AI_KEY_INVALID"
    assert "apiKey" in response.json()["error"]["fields"]
    assert (await client.get("/api/ai/status")).json()["active"]["tier"] == "free"


async def test_custom_endpoint_must_be_public_https(client: AsyncClient, calls: list) -> None:
    await signup(client)
    for base_url in (None, "http://api.example.com/v1", "https://127.0.0.1/v1"):
        response = await client.put(
            "/api/ai/connection",
            json={"provider": "custom", "model": "m", "apiKey": "k", "baseUrl": base_url},
        )
        assert response.status_code == 422
        assert response.json()["error"]["code"] in {"BASE_URL_REQUIRED", "INVALID_BASE_URL"}
    assert calls == []


async def test_provider_failures_become_actionable_errors(
    client: AsyncClient, calls: list, monkeypatch: pytest.MonkeyPatch
) -> None:
    await signup(client)
    await client.put("/api/ai/connection", json={"provider": "gemini", "model": "g", "apiKey": "own-key"})
    user = await _user()

    for kind, code in (("quota", "AI_PROVIDER_LIMIT"), ("auth", "AI_KEY_INVALID"), ("model", "AI_MODEL_UNAVAILABLE")):

        async def failing(*args, kind=kind, **kwargs):
            raise ProviderError(kind)

        monkeypatch.setattr(service.llm, "generate", failing)
        with pytest.raises(AppError) as exc:
            await service.generate(user, "rank")
        assert exc.value.code == code
        # Never 401: the frontend treats 401 as an expired session.
        assert exc.value.status_code != 401

    # The shared free key running out of provider quota reads as the free limit, with the same way forward.
    async def exhausted(*args, **kwargs):
        raise ProviderError("quota")

    monkeypatch.setattr(service.llm, "generate", exhausted)
    await client.delete("/api/ai/connection")
    with pytest.raises(AppError) as exc:
        await service.generate(user, "rank")
    assert exc.value.code == "AI_FREE_LIMIT_REACHED"


def test_parse_json_accepts_fenced_or_wrapped_objects() -> None:
    assert parse_json('```json\n{"a": 1}\n```') == {"a": 1}
    assert parse_json('Here you go: {"a": {"b": 2}} Hope it helps.') == {"a": {"b": 2}}
    with pytest.raises(ProviderError):
        parse_json("[1, 2]")
