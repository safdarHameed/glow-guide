"""Providers a user can connect. The free tier runs on the app's own Gemini key."""

from dataclasses import dataclass

from app.services.llm import GEMINI_BASE_URL, Protocol


@dataclass(frozen=True)
class Provider:
    id: str
    name: str
    protocol: Protocol
    # None means the user supplies the base URL (any OpenAI-compatible endpoint).
    base_url: str | None
    # Product discovery needs live web results; providers without a search tool use the free model for that step.
    web_search: bool
    key_url: str | None
    key_placeholder: str


PROVIDERS: dict[str, Provider] = {
    p.id: p
    for p in (
        Provider(
            "openai",
            "ChatGPT (OpenAI)",
            "openai",
            "https://api.openai.com/v1",
            True,
            "https://platform.openai.com/api-keys",
            "sk-...",
        ),
        Provider(
            "gemini",
            "Google Gemini",
            "gemini",
            GEMINI_BASE_URL,
            True,
            "https://aistudio.google.com/app/apikey",
            "AIza...",
        ),
        Provider("xai", "Grok (xAI)", "openai", "https://api.x.ai/v1", True, "https://console.x.ai", "xai-..."),
        Provider("custom", "Other (OpenAI-compatible)", "openai", None, False, None, "Your API key"),
    )
}

FREE_PROVIDER = PROVIDERS["gemini"]
FREE_PROVIDER_NAME = "GlowGuide Free"
