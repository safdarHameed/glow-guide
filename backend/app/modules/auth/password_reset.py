import logging
from datetime import UTC, datetime, timedelta
from urllib.parse import urlencode

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool

from app.core.config import get_settings
from app.core.exceptions import AppError, bad_request
from app.core.security import generate_token, hash_password, hash_token
from app.modules.auth.models import PasswordResetToken
from app.modules.auth.sessions import revoke_all_user_sessions
from app.modules.users import repository as users
from app.modules.users.models import User
from app.services.email_templates import password_reset_email
from app.services.mailer import send_mail

logger = logging.getLogger(__name__)


def _invalid_link() -> AppError:
    return bad_request("INVALID_RESET_TOKEN", "This reset link is invalid or has expired. Please request a new one.")


async def request_password_reset(db: AsyncSession, email: str) -> None:
    """Silent when the email is unknown, so the endpoint can't be used to discover accounts."""
    user = await users.get_by_email(db, email)
    if user is None:
        return

    settings = get_settings()
    token = generate_token(32)

    # Only the newest link works.
    await db.execute(
        update(PasswordResetToken)
        .where(PasswordResetToken.user_id == user.id, PasswordResetToken.used_at.is_(None))
        .values(used_at=func.now())
    )
    db.add(
        PasswordResetToken(
            user_id=user.id,
            token_hash=hash_token(token),
            expires_at=datetime.now(UTC) + timedelta(minutes=settings.password_reset_ttl_minutes),
        )
    )
    await db.commit()

    link = f"{settings.app_url.rstrip('/')}/auth/reset-password?{urlencode({'token': token})}"
    try:
        await send_mail(password_reset_email(user.email, user.name, link, settings.password_reset_ttl_minutes))
    except Exception:
        logger.exception("Failed to send password reset email to user %s", user.id)


async def reset_password(db: AsyncSession, token: str, password: str) -> None:
    """Sets the new password, burns the link and signs the user out on every device."""
    token_hash = hash_token(token)
    record = await db.scalar(
        select(PasswordResetToken).where(
            PasswordResetToken.token_hash == token_hash,
            PasswordResetToken.used_at.is_(None),
            PasswordResetToken.expires_at > func.now(),
        )
    )
    if record is None:
        raise _invalid_link()

    password_hash = await run_in_threadpool(hash_password, password)

    # Claim the token atomically so a link can't be used twice by concurrent requests.
    claimed = await db.scalar(
        update(PasswordResetToken)
        .where(PasswordResetToken.id == record.id, PasswordResetToken.used_at.is_(None))
        .values(used_at=func.now())
        .returning(PasswordResetToken.user_id)
    )
    if claimed is None:
        raise _invalid_link()

    await db.execute(update(User).where(User.id == claimed).values(password_hash=password_hash))
    await revoke_all_user_sessions(db, claimed)
    await db.commit()
