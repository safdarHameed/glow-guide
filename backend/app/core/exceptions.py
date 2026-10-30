"""One error shape for every response: {"error": {"code", "message", "fields"?}}.

`code` is stable and machine-readable for the frontend; `message` is safe to show to users.
"""

import logging

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger(__name__)


class AppError(Exception):
    def __init__(self, status_code: int, code: str, message: str, fields: dict[str, str] | None = None) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message
        self.fields = fields


def bad_request(code: str, message: str) -> AppError:
    return AppError(status.HTTP_400_BAD_REQUEST, code, message)


def unauthorized(message: str = "Please log in to continue.", code: str = "UNAUTHORIZED") -> AppError:
    return AppError(status.HTTP_401_UNAUTHORIZED, code, message)


def conflict(code: str, message: str, fields: dict[str, str] | None = None) -> AppError:
    return AppError(status.HTTP_409_CONFLICT, code, message, fields)


def service_unavailable(code: str, message: str) -> AppError:
    return AppError(status.HTTP_503_SERVICE_UNAVAILABLE, code, message)


def error_response(status_code: int, code: str, message: str, fields: dict[str, str] | None = None) -> JSONResponse:
    body: dict = {"code": code, "message": message}
    if fields:
        body["fields"] = fields
    return JSONResponse(status_code=status_code, content={"error": body})


def _friendly(error: dict) -> str:
    if error["type"] == "missing":
        return "This field is required."
    return str(error["msg"]).removeprefix("Value error, ")


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def _app_error(_: Request, exc: AppError) -> JSONResponse:
        return error_response(exc.status_code, exc.code, exc.message, exc.fields)

    @app.exception_handler(RequestValidationError)
    async def _validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
        fields: dict[str, str] = {}
        for error in exc.errors():
            loc = [str(part) for part in error["loc"] if part != "body"]
            fields.setdefault(".".join(loc) or "body", _friendly(error))
        return error_response(422, "VALIDATION_ERROR", "Some fields need attention.", fields)

    @app.exception_handler(RateLimitExceeded)
    async def _rate_limited(_: Request, __: RateLimitExceeded) -> JSONResponse:
        return error_response(429, "RATE_LIMITED", "Too many attempts. Please wait a few minutes and try again.")

    @app.exception_handler(StarletteHTTPException)
    async def _http_error(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        code = "NOT_FOUND" if exc.status_code == 404 else "HTTP_ERROR"
        return error_response(exc.status_code, code, str(exc.detail))

    @app.exception_handler(Exception)
    async def _unhandled(request: Request, exc: Exception) -> JSONResponse:
        logger.exception("Unhandled error on %s %s", request.method, request.url.path, exc_info=exc)
        return error_response(500, "INTERNAL_ERROR", "Something went wrong on our side. Please try again.")
