import asyncio
import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager, suppress
from datetime import UTC, datetime

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import delete, text

from app.api.deps import DbSession
from app.api.router import api_router
from app.core.config import get_settings
from app.core.exceptions import register_exception_handlers
from app.core.logging import configure_logging
from app.core.middleware import SecurityHeadersMiddleware
from app.core.rate_limit import limiter
from app.db.session import SessionLocal, engine
from app.modules.scans.models import Scan

logger = logging.getLogger("app")


async def cleanup_private_reports():
    while True:
        try:
            async with SessionLocal() as db:
                await db.execute(delete(Scan).where(Scan.expires_at < datetime.now(UTC)))
                await db.commit()
        except Exception:
            logger.warning("Private report cleanup failed; it will be retried")
        await asyncio.sleep(60)


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    if not settings.google_enabled:
        logger.warning("Google sign-in disabled: set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable it")
    if not settings.smtp_enabled:
        logger.warning("SMTP not configured: emails will be printed to this log instead of sent")
    cleanup = asyncio.create_task(cleanup_private_reports())
    try:
        yield
    finally:
        cleanup.cancel()
        with suppress(asyncio.CancelledError):
            await cleanup
    await engine.dispose()


def create_app() -> FastAPI:
    configure_logging()
    settings = get_settings()

    app = FastAPI(
        title="GlowGuide API",
        version="0.1.0",
        lifespan=lifespan,
        docs_url=None if settings.is_production else "/docs",
        redoc_url=None,
        openapi_url=None if settings.is_production else "/openapi.json",
    )
    app.state.limiter = limiter
    register_exception_handlers(app)

    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        allow_headers=["Content-Type", "Authorization"],
    )

    app.include_router(api_router)

    @app.get("/health", tags=["meta"])
    async def health(db: DbSession) -> dict[str, str]:
        await db.execute(text("SELECT 1"))
        return {"status": "ok"}

    return app


app = create_app()
