"""Bounded HTTP calls. Untrusted result URLs never receive provider credentials."""

import asyncio
import ipaddress
import socket
from urllib.parse import urljoin, urlsplit

import httpx

from app.core.exceptions import service_unavailable


async def public_url(url: str) -> str:
    parsed = urlsplit(url)
    if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.port not in (None, 443):
        raise ValueError("Expected a public HTTPS URL.")
    addresses = await asyncio.get_running_loop().getaddrinfo(parsed.hostname, 443, type=socket.SOCK_STREAM)
    if not addresses or any(not ipaddress.ip_address(a[4][0]).is_global for a in addresses):
        raise ValueError("Private network URLs are not allowed.")
    return url


async def download(url: str, max_bytes: int = 10 * 1024 * 1024) -> tuple[bytes, str]:
    async with httpx.AsyncClient(timeout=20) as client:
        for _ in range(4):
            await public_url(url)
            async with client.stream("GET", url) as response:
                if response.is_redirect:
                    url = urljoin(url, response.headers["location"])
                    continue
                response.raise_for_status()
                parts, size = [], 0
                async for part in response.aiter_bytes():
                    size += len(part)
                    if size > max_bytes:
                        raise ValueError("Remote file exceeds the size limit.")
                    parts.append(part)
                return b"".join(parts), response.headers.get("content-type", "application/octet-stream").split(";")[0]
    raise ValueError("Too many redirects.")


async def json_request(method: str, url: str, **kwargs) -> dict:
    try:
        async with httpx.AsyncClient(timeout=kwargs.pop("timeout", 25)) as client:
            response = await client.request(method, url, **kwargs)
            response.raise_for_status()
            return response.json()
    except (httpx.HTTPError, ValueError) as exc:
        raise service_unavailable(
            "PROVIDER_UNAVAILABLE", "The data provider is unavailable. Please try again."
        ) from exc
