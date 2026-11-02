from datetime import datetime
from typing import Literal

from pydantic import Field

from app.core.schemas import ApiModel

ProviderId = Literal["openai", "gemini", "xai", "custom"]


class ProviderOut(ApiModel):
    id: ProviderId
    name: str
    web_search: bool
    needs_base_url: bool
    key_url: str | None
    key_placeholder: str


class ActiveModelOut(ApiModel):
    tier: Literal["free", "own"]
    provider: ProviderId
    provider_name: str
    model: str
    key_hint: str | None = None
    base_url: str | None = None
    web_search: bool
    # The stored key can't be decrypted (the server's encryption secret changed); the user must re-enter it.
    needs_reconnect: bool = False


class FreeTierOut(ApiModel):
    available: bool
    model: str
    used: int
    limit: int
    remaining: int
    resets_at: datetime


class AiStatusOut(ApiModel):
    active: ActiveModelOut | None
    free: FreeTierOut
    providers: list[ProviderOut]


class ModelsIn(ApiModel):
    provider: ProviderId
    api_key: str = Field(min_length=1, max_length=500)
    base_url: str | None = Field(default=None, max_length=500)


class ModelsOut(ApiModel):
    models: list[str]


class ConnectIn(ApiModel):
    provider: ProviderId
    model: str = Field(min_length=1, max_length=200)
    # Optional when only changing the model of the provider already connected.
    api_key: str | None = Field(default=None, max_length=500)
    base_url: str | None = Field(default=None, max_length=500)
