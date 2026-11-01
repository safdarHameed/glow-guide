from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """All configuration comes from the environment (or backend/.env in development)."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    environment: Literal["development", "test", "production"] = "development"

    database_url: str = "postgresql+asyncpg://localhost:5432/glowguide"

    # Frontend origin: used for CORS and for links in emails.
    app_url: str = "http://localhost:3001"
    cors_origins: str = "http://localhost:3001"

    jwt_secret: str = Field(min_length=32)
    access_token_ttl_minutes: int = 15
    refresh_token_ttl_days: int = 30
    password_reset_ttl_minutes: int = 30

    google_client_id: str | None = None
    google_client_secret: str | None = None

    youcam_api_key: str | None = None
    gemini_api_key: str | None = None
    gemini_model: str = "gemini-3.8-flash"
    scan_timeout_seconds: int = 60

    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_user: str | None = None
    smtp_password: str | None = None
    mail_from: str = "GlowGuide <no-reply@glowguide.app>"

    @field_validator(
        "google_client_id", "google_client_secret", "smtp_host", "smtp_user", "smtp_password", mode="before"
    )
    @classmethod
    def _empty_as_none(cls, value: str | None) -> str | None:
        return value or None

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def google_enabled(self) -> bool:
        return bool(self.google_client_id and self.google_client_secret)

    @property
    def smtp_enabled(self) -> bool:
        return bool(self.smtp_host)


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
