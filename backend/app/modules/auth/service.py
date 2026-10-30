"""Authentication use cases. Routers stay thin; all rules live here."""

import uuid
from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool

from app.core.exceptions import AppError, conflict, unauthorized
from app.core.security import hash_password, verify_password
from app.modules.auth.google import get_google_profile
from app.modules.auth.schemas import LoginIn, SignupIn
from app.modules.auth.sessions import (
    IssuedTokens,
    SessionMeta,
    create_session,
    revoke_session_by_token,
    rotate_session,
)
from app.modules.users import repository as users
from app.modules.users.models import User


@dataclass(frozen=True)
class AuthResult:
    user: User
    tokens: IssuedTokens
    is_new_user: bool = False


def _email_in_use() -> AppError:
    message = "An account with this email already exists."
    return conflict("EMAIL_IN_USE", message, {"email": message})


def _session_ended() -> AppError:
    return unauthorized("Your session has ended. Please log in again.", "SESSION_EXPIRED")


async def _start_session(db: AsyncSession, user: User, meta: SessionMeta, *, is_new_user: bool = False) -> AuthResult:
    tokens = await create_session(db, user.id, meta)
    await db.commit()
    return AuthResult(user, tokens, is_new_user)


async def signup(db: AsyncSession, data: SignupIn, meta: SessionMeta) -> AuthResult:
    if await users.get_by_email(db, data.email):
        raise _email_in_use()

    # Argon2 is deliberately slow; keep it off the event loop.
    password_hash = await run_in_threadpool(hash_password, data.password)
    user = User(name=data.name, email=data.email, password_hash=password_hash)
    db.add(user)
    try:
        await db.flush()
    except IntegrityError as exc:
        # Two sign-ups with the same email at the same moment.
        await db.rollback()
        raise _email_in_use() from exc

    return await _start_session(db, user, meta, is_new_user=True)


async def login(db: AsyncSession, data: LoginIn, meta: SessionMeta) -> AuthResult:
    user = await users.get_by_email(db, data.email)
    valid, new_hash = await run_in_threadpool(verify_password, data.password, user.password_hash if user else None)
    # One message for every failure, so the form never reveals which emails have accounts.
    if user is None or not valid:
        raise unauthorized("Email or password is incorrect.", "INVALID_CREDENTIALS")
    if new_hash:
        # Hashing parameters were raised since this password was set; upgrade it now that we have the plaintext.
        user.password_hash = new_hash
    return await _start_session(db, user, meta)


async def login_with_google(db: AsyncSession, code: str, meta: SessionMeta) -> AuthResult:
    profile = await get_google_profile(code)

    linked = await users.get_by_google_id(db, profile.google_id)
    if linked:
        return await _start_session(db, linked, meta)

    existing = await users.get_by_email(db, profile.email)
    if existing:
        # Only attach Google to an email account when Google has verified that address.
        if not profile.email_verified:
            raise conflict(
                "EMAIL_IN_USE", "An account with this email already exists. Please log in with your password."
            )
        existing.google_id = profile.google_id
        existing.avatar_url = existing.avatar_url or profile.picture
        existing.email_verified_at = existing.email_verified_at or datetime.now(UTC)
        return await _start_session(db, existing, meta)

    user = User(
        email=profile.email,
        name=profile.name,
        google_id=profile.google_id,
        avatar_url=profile.picture,
        email_verified_at=datetime.now(UTC) if profile.email_verified else None,
    )
    db.add(user)
    await db.flush()
    return await _start_session(db, user, meta, is_new_user=True)


async def refresh(db: AsyncSession, refresh_token: str) -> AuthResult:
    rotated = await rotate_session(db, refresh_token)
    if rotated is None:
        raise _session_ended()
    user = await users.get_by_id(db, rotated.user_id)
    if user is None:
        raise _session_ended()
    await db.commit()
    return AuthResult(user, rotated.tokens)


async def logout(db: AsyncSession, refresh_token: str | None) -> None:
    if refresh_token:
        await revoke_session_by_token(db, refresh_token)
        await db.commit()


async def get_user(db: AsyncSession, user_id: uuid.UUID) -> User:
    user = await users.get_by_id(db, user_id)
    if user is None:
        raise unauthorized()
    return user
