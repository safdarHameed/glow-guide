"""Google sign-in using the popup authorization-code flow (Google Identity Services)."""

import logging
from dataclasses import dataclass

import httpx
import jwt
from starlette.concurrency import run_in_threadpool

from app.core.config import get_settings
from app.core.exceptions import AppError, bad_request, service_unavailable

logger = logging.getLogger(__name__)

_TOKEN_URL = "https://oauth2.googleapis.com/token"  # noqa: S105 (an endpoint, not a secret)
_ISSUERS = ["https://accounts.google.com", "accounts.google.com"]
_jwks = jwt.PyJWKClient("https://www.googleapis.com/oauth2/v3/certs", cache_keys=True)


@dataclass(frozen=True)
class GoogleProfile:
    google_id: str
    email: str
    email_verified: bool
    name: str
    picture: str | None


def _failed() -> AppError:
    return bad_request("GOOGLE_AUTH_FAILED", "Google sign-in didn't work. Please try again.")


async def get_google_profile(code: str) -> GoogleProfile:
    """Exchanges the one-time code from the Google popup for a verified profile."""
    settings = get_settings()
    if not settings.google_enabled:
        raise service_unavailable("GOOGLE_NOT_CONFIGURED", "Google sign-in isn't set up yet. Please use email for now.")

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(
                _TOKEN_URL,
                data={
                    "code": code,
                    "client_id": settings.google_client_id,
                    "client_secret": settings.google_client_secret,
                    # The redirect URI Google expects for codes obtained through the popup.
                    "redirect_uri": "postmessage",
                    "grant_type": "authorization_code",
                },
            )
        response.raise_for_status()
        id_token = response.json()["id_token"]

        signing_key = await run_in_threadpool(_jwks.get_signing_key_from_jwt, id_token)
        claims = jwt.decode(
            id_token,
            signing_key.key,
            algorithms=["RS256"],
            audience=settings.google_client_id,
            issuer=_ISSUERS,
        )
    except (httpx.HTTPError, KeyError, ValueError, jwt.PyJWTError) as exc:
        logger.warning("Google code exchange failed: %s", exc)
        raise _failed() from exc

    email = claims.get("email")
    if not claims.get("sub") or not email:
        raise _failed()

    return GoogleProfile(
        google_id=claims["sub"],
        email=email.lower(),
        email_verified=bool(claims.get("email_verified")),
        name=claims.get("name") or email.split("@")[0],
        picture=claims.get("picture"),
    )
