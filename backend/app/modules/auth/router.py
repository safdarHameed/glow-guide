from fastapi import APIRouter, Request, Response, status
from fastapi.responses import JSONResponse

from app.api.deps import CurrentUser, DbSession
from app.core.config import get_settings
from app.core.exceptions import AppError, error_response
from app.core.rate_limit import AUTH_RATE_LIMIT, limiter
from app.core.schemas import MessageOut
from app.modules.auth import service
from app.modules.auth.cookies import REFRESH_COOKIE, clear_auth_cookies, set_auth_cookies
from app.modules.auth.password_reset import request_password_reset, reset_password
from app.modules.auth.schemas import (
    AuthOut,
    ForgotPasswordIn,
    GoogleIn,
    GoogleProviderOut,
    LoginIn,
    MeOut,
    ProvidersOut,
    ResetPasswordIn,
    SignupIn,
)
from app.modules.auth.sessions import SessionMeta
from app.modules.users.schemas import UserPublic

router = APIRouter(prefix="/auth", tags=["auth"])


def _meta(request: Request) -> SessionMeta:
    return SessionMeta(
        user_agent=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None,
    )


def _auth_response(result: service.AuthResult, status_code: int = status.HTTP_200_OK) -> JSONResponse:
    body = AuthOut(user=UserPublic.from_model(result.user), is_new_user=result.is_new_user)
    response = JSONResponse(status_code=status_code, content=body.model_dump(mode="json", by_alias=True))
    set_auth_cookies(response, result.tokens)
    return response


@router.get("/providers", response_model=ProvidersOut)
async def providers() -> ProvidersOut:
    """Which sign-in methods the frontend should offer."""
    settings = get_settings()
    return ProvidersOut(
        google=GoogleProviderOut(
            enabled=settings.google_enabled,
            client_id=settings.google_client_id if settings.google_enabled else None,
        )
    )


@router.post("/signup", response_model=AuthOut, status_code=status.HTTP_201_CREATED)
@limiter.limit(AUTH_RATE_LIMIT)
async def signup(request: Request, body: SignupIn, db: DbSession) -> JSONResponse:
    return _auth_response(await service.signup(db, body, _meta(request)), status.HTTP_201_CREATED)


@router.post("/login", response_model=AuthOut)
@limiter.limit(AUTH_RATE_LIMIT)
async def login(request: Request, body: LoginIn, db: DbSession) -> JSONResponse:
    return _auth_response(await service.login(db, body, _meta(request)))


@router.post("/google", response_model=AuthOut)
@limiter.limit(AUTH_RATE_LIMIT)
async def google(request: Request, body: GoogleIn, db: DbSession) -> JSONResponse:
    return _auth_response(await service.login_with_google(db, body.code, _meta(request)))


@router.post("/refresh", response_model=AuthOut)
async def refresh(request: Request, db: DbSession) -> JSONResponse:
    """Rotates the refresh token from the httpOnly cookie. Failure clears all auth cookies."""
    token = request.cookies.get(REFRESH_COOKIE)
    try:
        if not token:
            raise AppError(status.HTTP_401_UNAUTHORIZED, "SESSION_EXPIRED", "Please log in to continue.")
        return _auth_response(await service.refresh(db, token))
    except AppError as exc:
        response = error_response(exc.status_code, exc.code, exc.message)
        clear_auth_cookies(response)
        return response


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(request: Request, db: DbSession) -> Response:
    await service.logout(db, request.cookies.get(REFRESH_COOKIE))
    response = Response(status_code=status.HTTP_204_NO_CONTENT)
    clear_auth_cookies(response)
    return response


@router.get("/me", response_model=MeOut)
async def me(user: CurrentUser) -> MeOut:
    return MeOut(user=UserPublic.from_model(user))


@router.post("/forgot-password", response_model=MessageOut)
@limiter.limit(AUTH_RATE_LIMIT)
async def forgot_password(request: Request, body: ForgotPasswordIn, db: DbSession) -> MessageOut:
    await request_password_reset(db, body.email)
    return MessageOut(message="If an account exists for that email, we've sent a link to reset your password.")


@router.post("/reset-password", response_model=MessageOut)
@limiter.limit(AUTH_RATE_LIMIT)
async def reset_password_route(request: Request, body: ResetPasswordIn, db: DbSession) -> JSONResponse:
    await reset_password(db, body.token, body.password)
    body_out = MessageOut(message="Your password has been updated. Please log in with your new password.")
    response = JSONResponse(content=body_out.model_dump(by_alias=True))
    clear_auth_cookies(response)
    return response
