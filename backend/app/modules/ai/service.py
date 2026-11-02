"""Which model answers a user's AI requests, free-tier accounting, and provider errors in plain language."""

import uuid
from dataclasses import dataclass
from datetime import UTC, date, datetime, time, timedelta

from sqlalchemy import delete, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.exceptions import AppError
from app.core.security import decrypt_secret, encrypt_secret
from app.db.session import SessionLocal
from app.modules.ai.models import AiConnection, AiUsage
from app.modules.ai.providers import FREE_PROVIDER, FREE_PROVIDER_NAME, PROVIDERS, Provider
from app.modules.ai.schemas import ActiveModelOut, AiStatusOut, ConnectIn, FreeTierOut, ProviderOut
from app.modules.users.models import User
from app.services import llm
from app.services.llm import ProviderError, Target
from app.services.remote import public_url

SETTINGS_HINT = "Settings → AI model"


@dataclass(frozen=True)
class ActiveModel:
    free: bool
    provider: Provider
    target: Target


def free_limit_reached() -> AppError:
    return AppError(
        429,
        "AI_FREE_LIMIT_REACHED",
        "You've used today's free AI requests. Connect your own model to keep going, or try again tomorrow.",
    )


def _today() -> date:
    return datetime.now(UTC).date()


def _free_target() -> Target | None:
    settings = get_settings()
    if not settings.gemini_api_key:
        return None
    return Target("gemini", FREE_PROVIDER.base_url or "", settings.gemini_api_key, settings.gemini_model, True)


async def _connection(user_id: uuid.UUID) -> AiConnection | None:
    # Own short session: AI calls happen deep inside other services, which hold the request session.
    async with SessionLocal() as db:
        return await db.get(AiConnection, user_id)


async def _active(user: User) -> ActiveModel:
    connection = await _connection(user.id)
    if connection is not None:
        provider = PROVIDERS.get(connection.provider)
        key = decrypt_secret(connection.api_key_encrypted)
        if provider is None or key is None:
            raise AppError(409, "AI_RECONNECT_REQUIRED", f"Please reconnect your AI model in {SETTINGS_HINT}.")
        base_url = connection.base_url or provider.base_url or ""
        return ActiveModel(
            False, provider, Target(provider.protocol, base_url, key, connection.model, provider.web_search)
        )
    free = _free_target()
    if free is None:
        raise AppError(
            503, "AI_NOT_CONFIGURED", f"The free AI model isn't available. Connect your own model in {SETTINGS_HINT}."
        )
    return ActiveModel(True, FREE_PROVIDER, free)


async def _consume_free(user_id: uuid.UUID) -> None:
    """Counts one free request, atomically, in its own committed transaction."""
    limit = get_settings().free_ai_daily_limit
    day = _today()
    async with SessionLocal() as db:
        for _ in range(2):
            counted = await db.scalar(
                update(AiUsage)
                .where(AiUsage.user_id == user_id, AiUsage.day == day, AiUsage.count < limit)
                .values(count=AiUsage.count + 1)
                .returning(AiUsage.count)
            )
            if counted is not None:
                await db.commit()
                return
            if limit <= 0 or await db.get(AiUsage, (user_id, day)) is not None:
                raise free_limit_reached()
            db.add(AiUsage(user_id=user_id, day=day, count=1))
            try:
                await db.commit()
                return
            except IntegrityError:
                # Another request created today's row first; count against it.
                await db.rollback()
    raise free_limit_reached()


def _request_error(exc: ProviderError, active: ActiveModel) -> AppError:
    if exc.kind == "invalid_response":
        return AppError(503, "INVALID_AI_RESPONSE", "The AI model returned incomplete data. Please try again.")
    if active.free:
        if exc.kind == "quota":
            return AppError(
                429,
                "AI_FREE_LIMIT_REACHED",
                "The free AI model is at capacity right now. Connect your own model to keep going, or try again later.",
            )
        return AppError(
            503, "AI_UNAVAILABLE", "The free AI model is unavailable right now. Try again shortly or connect your own."
        )
    name, model = active.provider.name, active.target.model
    if exc.kind == "auth":
        return AppError(409, "AI_KEY_INVALID", f"{name} rejected your API key. Update it in {SETTINGS_HINT}.")
    if exc.kind == "quota":
        return AppError(
            429,
            "AI_PROVIDER_LIMIT",
            f"Your {name} account reached its rate limit or quota. Check your {name} plan, or switch models in "
            f"{SETTINGS_HINT}.",
        )
    if exc.kind == "model":
        return AppError(
            409,
            "AI_MODEL_UNAVAILABLE",
            f"{name} can't use the model {model} with your key. Pick another in {SETTINGS_HINT}.",
        )
    return AppError(503, "AI_UNAVAILABLE", f"{name} is unavailable right now. Please try again.")


async def generate(user: User, prompt: str, *, search: bool = False) -> tuple[dict, list[dict]]:
    """Runs a prompt on the user's model: their connected provider, otherwise the daily-limited free tier."""
    active = await _active(user)
    if search and not active.target.web_search:
        # Endpoints without a web search tool can't find live product pages; that one step uses the free model.
        free = _free_target()
        if free is None:
            raise AppError(
                409,
                "AI_SEARCH_UNSUPPORTED",
                "Your connected model can't search the web, which product search needs. Connect ChatGPT, Gemini or "
                f"Grok in {SETTINGS_HINT}.",
            )
        active = ActiveModel(True, FREE_PROVIDER, free)
    if active.free:
        await _consume_free(user.id)
    elif active.provider.base_url is None:
        # User-supplied endpoint: re-check at call time that it still resolves to a public address.
        await _checked_base_url(active.target.base_url)
    try:
        return await llm.generate(active.target, prompt, search=search)
    except ProviderError as exc:
        raise _request_error(exc, active) from exc


# --- Settings: status, connect, disconnect -------------------------------------------------------------------


async def status(db: AsyncSession, user: User) -> AiStatusOut:
    settings = get_settings()
    limit = settings.free_ai_daily_limit
    used = await db.scalar(select(AiUsage.count).where(AiUsage.user_id == user.id, AiUsage.day == _today())) or 0
    free = FreeTierOut(
        available=bool(settings.gemini_api_key),
        model=settings.gemini_model,
        used=min(used, limit),
        limit=limit,
        remaining=max(0, limit - used),
        resets_at=datetime.combine(_today() + timedelta(days=1), time.min, UTC),
    )
    connection = await db.get(AiConnection, user.id)
    provider = PROVIDERS.get(connection.provider) if connection else None
    if connection and provider:
        active = ActiveModelOut(
            tier="own",
            provider=provider.id,  # type: ignore[arg-type]
            provider_name=provider.name,
            model=connection.model,
            key_hint=connection.key_hint,
            base_url=connection.base_url,
            web_search=provider.web_search,
            needs_reconnect=decrypt_secret(connection.api_key_encrypted) is None,
        )
    elif free.available:
        active = ActiveModelOut(
            tier="free", provider="gemini", provider_name=FREE_PROVIDER_NAME, model=free.model, web_search=True
        )
    else:
        active = None
    providers = [
        ProviderOut(
            id=p.id,  # type: ignore[arg-type]
            name=p.name,
            web_search=p.web_search,
            needs_base_url=p.base_url is None,
            key_url=p.key_url,
            key_placeholder=p.key_placeholder,
        )
        for p in PROVIDERS.values()
    ]
    return AiStatusOut(active=active, free=free, providers=providers)


async def _checked_base_url(url: str) -> str:
    try:
        return await public_url(url)
    except (ValueError, OSError) as exc:
        message = "Use a public HTTPS address, for example https://api.example.com/v1."
        raise AppError(422, "INVALID_BASE_URL", message, {"baseUrl": message}) from exc


async def _base_url(provider: Provider, base_url: str | None) -> str:
    if provider.base_url:
        return provider.base_url
    if not base_url or not base_url.strip():
        message = "Enter the API base URL, for example https://api.example.com/v1."
        raise AppError(422, "BASE_URL_REQUIRED", message, {"baseUrl": message})
    return await _checked_base_url(base_url.strip().rstrip("/"))


def _connect_error(exc: ProviderError, provider: Provider) -> AppError:
    name = provider.name
    if exc.kind == "auth":
        message = f"{name} rejected this API key. Check it and try again."
        return AppError(422, "AI_KEY_INVALID", message, {"apiKey": message})
    if exc.kind == "quota":
        return AppError(422, "AI_PROVIDER_LIMIT", f"This {name} account is out of quota or rate limited right now.")
    if exc.kind == "model":
        message = "This model isn't available with your key. Choose another."
        return AppError(422, "AI_MODEL_UNAVAILABLE", message, {"model": message})
    if exc.kind == "invalid_response":
        message = "This model didn't return valid JSON, which GlowGuide needs. Choose another model."
        return AppError(422, "AI_MODEL_UNSUITABLE", message, {"model": message})
    return AppError(503, "AI_UNAVAILABLE", f"Couldn't reach {name}. Check the details and try again.")


async def list_models(provider_id: str, api_key: str, base_url: str | None) -> list[str]:
    provider = PROVIDERS[provider_id]
    url = await _base_url(provider, base_url)
    try:
        return await llm.list_models(provider.protocol, url, api_key.strip())
    except ProviderError as exc:
        raise _connect_error(exc, provider) from exc


async def connect(db: AsyncSession, user: User, data: ConnectIn) -> None:
    """Checks the key and model with a tiny live request, then stores the key encrypted."""
    provider = PROVIDERS[data.provider]
    existing = await db.get(AiConnection, user.id)
    key = (data.api_key or "").strip() or None
    if key is None and existing is not None and existing.provider == provider.id:
        key = decrypt_secret(existing.api_key_encrypted)
    if key is None:
        raise AppError(422, "API_KEY_REQUIRED", "Enter your API key.", {"apiKey": "Enter your API key."})
    url = await _base_url(provider, data.base_url)
    model = data.model.strip()
    try:
        await llm.generate(Target(provider.protocol, url, key, model, provider.web_search), 'Reply with {"ok": true}.')
    except ProviderError as exc:
        raise _connect_error(exc, provider) from exc

    row = existing or AiConnection(user_id=user.id)
    row.provider = provider.id
    row.model = model
    row.base_url = url if provider.base_url is None else None
    row.api_key_encrypted = encrypt_secret(key)
    row.key_hint = key[-4:]
    if existing is None:
        db.add(row)
    await db.commit()


async def disconnect(db: AsyncSession, user: User) -> None:
    await db.execute(delete(AiConnection).where(AiConnection.user_id == user.id))
    await db.commit()


async def forget_user(db: AsyncSession, user_id: uuid.UUID) -> None:
    """Usage rows have no foreign key, so account deletion removes them here."""
    await db.execute(delete(AiUsage).where(AiUsage.user_id == user_id))
