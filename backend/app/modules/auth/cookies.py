from fastapi import Response

from app.core.config import get_settings
from app.modules.auth.sessions import IssuedTokens

ACCESS_COOKIE = "gg_access"
REFRESH_COOKIE = "gg_refresh"
# Not httpOnly and holds no secret: it only lets the frontend route a signed-in visitor without a round trip.
SESSION_HINT_COOKIE = "gg_session"

# The refresh token is only ever sent to the auth routes, never to the rest of the API.
REFRESH_PATH = "/api/auth"


def set_auth_cookies(response: Response, tokens: IssuedTokens) -> None:
    settings = get_settings()
    secure = settings.is_production
    response.set_cookie(
        ACCESS_COOKIE,
        tokens.access_token,
        max_age=settings.access_token_ttl_minutes * 60,
        path="/",
        httponly=True,
        secure=secure,
        samesite="lax",
    )
    response.set_cookie(
        REFRESH_COOKIE,
        tokens.refresh_token,
        expires=tokens.refresh_expires_at,
        path=REFRESH_PATH,
        httponly=True,
        secure=secure,
        samesite="lax",
    )
    response.set_cookie(
        SESSION_HINT_COOKIE, "1", expires=tokens.refresh_expires_at, path="/", secure=secure, samesite="lax"
    )


def clear_auth_cookies(response: Response) -> None:
    secure = get_settings().is_production
    response.delete_cookie(ACCESS_COOKIE, path="/", httponly=True, secure=secure, samesite="lax")
    response.delete_cookie(REFRESH_COOKIE, path=REFRESH_PATH, httponly=True, secure=secure, samesite="lax")
    response.delete_cookie(SESSION_HINT_COOKIE, path="/", secure=secure, samesite="lax")
