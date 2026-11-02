"""Password hashing, opaque tokens, access JWTs and encryption of stored third-party secrets."""

import base64
import hashlib
import secrets
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

import jwt
from cryptography.fernet import Fernet, InvalidToken
from pwdlib import PasswordHash

from app.core.config import get_settings

_ISSUER = "glowguide-api"
_ALGORITHM = "HS256"

_hasher = PasswordHash.recommended()  # Argon2id
# Verified against when the email is unknown, so "no such user" takes as long as "wrong password".
_DUMMY_HASH = _hasher.hash("glowguide-timing-equaliser")


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, hashed: str | None) -> tuple[bool, str | None]:
    """Returns (valid, new_hash). new_hash is set when the stored hash uses outdated parameters."""
    if hashed is None:
        _hasher.verify(password, _DUMMY_HASH)
        return False, None
    return _hasher.verify_and_update(password, hashed)


def generate_token(nbytes: int = 48) -> str:
    """URL-safe random token for refresh and password-reset links."""
    return secrets.token_urlsafe(nbytes)


def hash_token(token: str) -> str:
    """Opaque tokens are stored hashed so a database leak cannot be replayed."""
    return hashlib.sha256(token.encode()).hexdigest()


@dataclass(frozen=True)
class AccessTokenPayload:
    user_id: uuid.UUID
    session_id: uuid.UUID


def create_access_token(user_id: uuid.UUID, session_id: uuid.UUID) -> str:
    """Short-lived JWT. It carries the session id so a revoked session is rejected before the token expires."""
    settings = get_settings()
    now = datetime.now(UTC)
    claims = {
        "sub": str(user_id),
        "sid": str(session_id),
        "iss": _ISSUER,
        "iat": now,
        "exp": now + timedelta(minutes=settings.access_token_ttl_minutes),
    }
    return jwt.encode(claims, settings.jwt_secret, algorithm=_ALGORITHM)


def decode_access_token(token: str) -> AccessTokenPayload | None:
    try:
        claims = jwt.decode(
            token,
            get_settings().jwt_secret,
            algorithms=[_ALGORITHM],
            issuer=_ISSUER,
            options={"require": ["sub", "sid", "exp"]},
        )
        return AccessTokenPayload(user_id=uuid.UUID(claims["sub"]), session_id=uuid.UUID(claims["sid"]))
    except (jwt.PyJWTError, ValueError):
        return None


def _fernet() -> Fernet:
    settings = get_settings()
    secret = settings.ai_keys_secret or settings.jwt_secret
    return Fernet(base64.urlsafe_b64encode(hashlib.sha256(f"glowguide-secrets:{secret}".encode()).digest()))


def encrypt_secret(value: str) -> str:
    """For provider API keys users connect; they are stored encrypted and never returned to clients."""
    return _fernet().encrypt(value.encode()).decode()


def decrypt_secret(value: str) -> str | None:
    """None when the encryption secret changed since the value was stored."""
    try:
        return _fernet().decrypt(value.encode()).decode()
    except InvalidToken:
        return None
