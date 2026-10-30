from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import get_settings

# Brute-force protection for credential endpoints. The client IP comes from X-Forwarded-For
# when the request arrives through the trusted Next.js proxy (uvicorn --proxy-headers).
AUTH_RATE_LIMIT = "20/15minutes"

limiter = Limiter(key_func=get_remote_address, enabled=get_settings().environment != "test")
