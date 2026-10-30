import os
from collections.abc import AsyncIterator

# Point the app at the test database before anything imports the settings.
os.environ["ENVIRONMENT"] = "test"
os.environ["DATABASE_URL"] = os.environ.get("TEST_DATABASE_URL", "postgresql+asyncpg://localhost:5432/glowguide_test")

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text

from app.db.models import Base
from app.db.session import engine
from app.main import app


@pytest.fixture(scope="session", autouse=True)
async def _schema() -> AsyncIterator[None]:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield


@pytest.fixture(autouse=True)
async def _clean_tables() -> AsyncIterator[None]:
    yield
    tables = ", ".join(t.name for t in reversed(Base.metadata.sorted_tables))
    async with engine.begin() as conn:
        await conn.execute(text(f"TRUNCATE {tables} CASCADE"))


@pytest.fixture
async def client() -> AsyncIterator[AsyncClient]:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c


async def signup(client: AsyncClient, email: str = "ayesha@example.com", password: str = "correct-horse") -> dict:
    response = await client.post("/api/auth/signup", json={"name": "Ayesha Khan", "email": email, "password": password})
    assert response.status_code == 201, response.text
    return response.json()
