import re

import pytest
from httpx import AsyncClient
from pwdlib.hashers.argon2 import Argon2Hasher
from sqlalchemy import select, update

from app.db.session import SessionLocal
from app.modules.auth import password_reset
from app.modules.users.models import User
from tests.conftest import signup


async def test_signup_sets_session_and_returns_public_user(client: AsyncClient) -> None:
    body = await signup(client, email="  Ayesha@Example.com ")

    assert body["isNewUser"] is True
    user = body["user"]
    assert user["email"] == "ayesha@example.com"
    assert user["hasPassword"] is True
    assert user["onboardingCompleted"] is False
    assert "passwordHash" not in user and "password_hash" not in user
    assert {"gg_access", "gg_refresh", "gg_session"} <= set(client.cookies.keys())

    me = await client.get("/api/auth/me")
    assert me.status_code == 200
    assert me.json()["user"]["id"] == user["id"]


async def test_signup_rejects_duplicate_email(client: AsyncClient) -> None:
    await signup(client)
    response = await client.post(
        "/api/auth/signup", json={"name": "Someone", "email": "AYESHA@example.com", "password": "another-pass"}
    )
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "EMAIL_IN_USE"
    assert "email" in response.json()["error"]["fields"]


async def test_signup_validation_messages(client: AsyncClient) -> None:
    response = await client.post("/api/auth/signup", json={"name": " ", "email": "nope", "password": "short"})
    assert response.status_code == 422
    error = response.json()["error"]
    assert error["code"] == "VALIDATION_ERROR"
    assert error["fields"] == {
        "name": "Enter your name.",
        "email": "Enter a valid email address.",
        "password": "Use at least 8 characters.",
    }


async def test_login_success_and_uniform_failure_message(client: AsyncClient) -> None:
    await signup(client)
    client.cookies.clear()

    ok = await client.post("/api/auth/login", json={"email": "ayesha@example.com", "password": "correct-horse"})
    assert ok.status_code == 200
    assert ok.json()["isNewUser"] is False

    wrong_password = await client.post("/api/auth/login", json={"email": "ayesha@example.com", "password": "nope-nope"})
    unknown_email = await client.post("/api/auth/login", json={"email": "ghost@example.com", "password": "nope-nope"})
    for response in (wrong_password, unknown_email):
        assert response.status_code == 401
        assert response.json()["error"] == {"code": "INVALID_CREDENTIALS", "message": "Email or password is incorrect."}


async def test_login_upgrades_outdated_password_hash(client: AsyncClient) -> None:
    await signup(client)
    client.cookies.clear()
    weak_hash = Argon2Hasher(time_cost=1, memory_cost=8192).hash("correct-horse")
    async with SessionLocal() as db:
        await db.execute(update(User).where(User.email == "ayesha@example.com").values(password_hash=weak_hash))
        await db.commit()

    ok = await client.post("/api/auth/login", json={"email": "ayesha@example.com", "password": "correct-horse"})
    assert ok.status_code == 200

    async with SessionLocal() as db:
        stored = await db.scalar(select(User.password_hash).where(User.email == "ayesha@example.com"))
    assert stored != weak_hash
    client.cookies.clear()
    again = await client.post("/api/auth/login", json={"email": "ayesha@example.com", "password": "correct-horse"})
    assert again.status_code == 200


async def test_me_requires_authentication(client: AsyncClient) -> None:
    response = await client.get("/api/auth/me")
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHORIZED"

    response = await client.get("/api/auth/me", headers={"Authorization": "Bearer not-a-jwt"})
    assert response.json()["error"]["code"] == "TOKEN_EXPIRED"


async def test_refresh_rotates_and_old_token_stops_working(client: AsyncClient) -> None:
    await signup(client)
    old_refresh = client.cookies.get("gg_refresh")

    rotated = await client.post("/api/auth/refresh")
    assert rotated.status_code == 200
    assert client.cookies.get("gg_refresh") != old_refresh

    client.cookies.set("gg_refresh", old_refresh, path="/api/auth")
    replay = await client.post("/api/auth/refresh")
    assert replay.status_code == 401
    assert replay.json()["error"]["code"] == "SESSION_EXPIRED"


async def test_logout_revokes_session_immediately(client: AsyncClient) -> None:
    await signup(client)
    access = client.cookies.get("gg_access")

    logout = await client.post("/api/auth/logout")
    assert logout.status_code == 204
    assert "gg_access" not in client.cookies

    # The access JWT hasn't expired yet, but its session is revoked.
    me = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {access}"})
    assert me.status_code == 401
    assert me.json()["error"]["code"] == "SESSION_EXPIRED"


async def test_password_reset_flow(client: AsyncClient, monkeypatch: pytest.MonkeyPatch) -> None:
    sent = []

    async def fake_send(mail):
        sent.append(mail)

    monkeypatch.setattr(password_reset, "send_mail", fake_send)

    await signup(client)
    old_access = client.cookies.get("gg_access")
    client.cookies.clear()

    unknown = await client.post("/api/auth/forgot-password", json={"email": "ghost@example.com"})
    known = await client.post("/api/auth/forgot-password", json={"email": "ayesha@example.com"})
    assert unknown.status_code == known.status_code == 200
    assert unknown.json() == known.json()  # no account enumeration
    assert len(sent) == 1

    token = re.search(r"token=([\w-]+)", sent[0].text).group(1)

    reset = await client.post("/api/auth/reset-password", json={"token": token, "password": "brand-new-pass"})
    assert reset.status_code == 200

    reuse = await client.post("/api/auth/reset-password", json={"token": token, "password": "another-pass"})
    assert reuse.status_code == 400
    assert reuse.json()["error"]["code"] == "INVALID_RESET_TOKEN"

    # Existing sessions were signed out.
    me = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {old_access}"})
    assert me.status_code == 401

    old = await client.post("/api/auth/login", json={"email": "ayesha@example.com", "password": "correct-horse"})
    new = await client.post("/api/auth/login", json={"email": "ayesha@example.com", "password": "brand-new-pass"})
    assert old.status_code == 401
    assert new.status_code == 200


async def test_google_reports_not_configured(client: AsyncClient) -> None:
    providers = await client.get("/api/auth/providers")
    assert providers.json() == {"google": {"enabled": False, "clientId": None}}

    response = await client.post("/api/auth/google", json={"code": "anything"})
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "GOOGLE_NOT_CONFIGURED"
