"""Device sessions backed by rotating refresh tokens."""

import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.security import create_access_token, generate_token, hash_token
from app.modules.auth.models import AuthSession


@dataclass(frozen=True)
class IssuedTokens:
    access_token: str
    refresh_token: str
    refresh_expires_at: datetime


@dataclass(frozen=True)
class SessionMeta:
    user_agent: str | None = None
    ip_address: str | None = None


@dataclass(frozen=True)
class RotatedSession:
    user_id: uuid.UUID
    tokens: IssuedTokens


def _refresh_expiry() -> datetime:
    return datetime.now(UTC) + timedelta(days=get_settings().refresh_token_ttl_days)


async def create_session(db: AsyncSession, user_id: uuid.UUID, meta: SessionMeta) -> IssuedTokens:
    """Adds the session to the unit of work; the caller commits."""
    refresh_token = generate_token()
    expires_at = _refresh_expiry()
    session = AuthSession(
        user_id=user_id,
        refresh_token_hash=hash_token(refresh_token),
        expires_at=expires_at,
        user_agent=meta.user_agent[:255] if meta.user_agent else None,
        ip_address=meta.ip_address,
    )
    db.add(session)
    await db.flush()
    return IssuedTokens(create_access_token(user_id, session.id), refresh_token, expires_at)


async def rotate_session(db: AsyncSession, refresh_token: str) -> RotatedSession | None:
    """Swaps a valid refresh token for a fresh pair with a sliding expiry.

    A single conditional UPDATE ... RETURNING means the old token stops working immediately and
    two requests racing with the same token cannot both succeed. Returns None when the token is
    unknown, expired, revoked or already used. The caller commits.
    """
    next_token = generate_token()
    expires_at = _refresh_expiry()
    row = (
        await db.execute(
            update(AuthSession)
            .where(
                AuthSession.refresh_token_hash == hash_token(refresh_token),
                AuthSession.revoked_at.is_(None),
                AuthSession.expires_at > func.now(),
            )
            .values(refresh_token_hash=hash_token(next_token), expires_at=expires_at, last_used_at=func.now())
            .returning(AuthSession.id, AuthSession.user_id)
        )
    ).first()
    if row is None:
        return None
    session_id, user_id = row
    return RotatedSession(user_id, IssuedTokens(create_access_token(user_id, session_id), next_token, expires_at))


async def find_active_session(db: AsyncSession, session_id: uuid.UUID) -> AuthSession | None:
    return await db.scalar(
        select(AuthSession).where(
            AuthSession.id == session_id,
            AuthSession.revoked_at.is_(None),
            AuthSession.expires_at > func.now(),
        )
    )


async def revoke_session_by_token(db: AsyncSession, refresh_token: str) -> None:
    await db.execute(
        update(AuthSession)
        .where(AuthSession.refresh_token_hash == hash_token(refresh_token), AuthSession.revoked_at.is_(None))
        .values(revoked_at=func.now())
    )


async def revoke_all_user_sessions(db: AsyncSession, user_id: uuid.UUID) -> None:
    await db.execute(
        update(AuthSession)
        .where(AuthSession.user_id == user_id, AuthSession.revoked_at.is_(None))
        .values(revoked_at=func.now())
    )
