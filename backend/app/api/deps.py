"""Shared FastAPI dependencies. Every protected route takes `user: CurrentUser`."""

from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import unauthorized
from app.core.security import decode_access_token
from app.db.session import get_db
from app.modules.auth.cookies import ACCESS_COOKIE
from app.modules.auth.sessions import find_active_session
from app.modules.users import repository as users
from app.modules.users.models import User

DbSession = Annotated[AsyncSession, Depends(get_db)]


async def get_current_user(request: Request, db: DbSession) -> User:
    """Accepts the access token from the httpOnly cookie (browser) or a Bearer header (other clients),
    and checks the session is still active so logout takes effect immediately."""
    header = request.headers.get("authorization", "")
    token = header.removeprefix("Bearer ") if header.startswith("Bearer ") else request.cookies.get(ACCESS_COOKIE)
    if not token:
        raise unauthorized()

    payload = decode_access_token(token)
    if payload is None:
        raise unauthorized("Your session has expired.", "TOKEN_EXPIRED")

    session = await find_active_session(db, payload.session_id)
    if session is None or session.user_id != payload.user_id:
        raise unauthorized("Your session has ended. Please log in again.", "SESSION_EXPIRED")

    user = await users.get_by_id(db, payload.user_id)
    if user is None:
        raise unauthorized()
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
