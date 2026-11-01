import os
from collections.abc import AsyncIterator
from pathlib import Path

import pytest
from dotenv import load_dotenv
from httpx import ASGITransport, AsyncClient
from sqlalchemy import delete, event, text
from sqlalchemy.engine import make_url

load_dotenv(Path(__file__).resolve().parents[1] / ".env", override=False)

# Point the app at the test database before anything imports the settings.
os.environ["ENVIRONMENT"] = "test"
os.environ["DATABASE_URL"] = os.environ.get("TEST_DATABASE_URL", "postgresql+asyncpg://localhost:5432/glowguide_test")
os.environ.setdefault("JWT_SECRET", "glowguide-test-secret-at-least-32-characters")

_test_url = make_url(os.environ["DATABASE_URL"])
if _test_url.get_backend_name() == "postgresql" and not (_test_url.database or "").endswith("_test"):
    raise RuntimeError("Tests require a dedicated PostgreSQL database with a name ending in _test.")

# These imports construct the engine, so they must follow test configuration and the database guard.
from app.db.models import Base  # noqa: E402
from app.db.session import engine  # noqa: E402
from app.main import app  # noqa: E402

app.state.limiter.enabled = False

if engine.dialect.name == "sqlite":

    @event.listens_for(engine.sync_engine, "connect")
    def foreign_keys(connection, _):
        connection.execute("PRAGMA foreign_keys=ON")


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
        if engine.dialect.name == "sqlite":
            for table in reversed(Base.metadata.sorted_tables):
                await conn.execute(delete(table))
        else:
            await conn.execute(text(f"TRUNCATE {tables} CASCADE"))


@pytest.fixture
async def client() -> AsyncIterator[AsyncClient]:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c


async def signup(client: AsyncClient, email: str = "ayesha@example.com", password: str = "correct-horse") -> dict:
    response = await client.post("/api/auth/signup", json={"name": "Ayesha Khan", "email": email, "password": password})
    assert response.status_code == 201, response.text
    return response.json()
