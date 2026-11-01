"""Create local configuration without overwriting existing settings or printing credentials."""

import os
import secrets
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]


def read_env(path: Path) -> dict[str, str]:
    if not path.exists():
        return {}
    result = {}
    for line in path.read_text().splitlines():
        if not line.strip() or line.lstrip().startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        result[key.strip()] = value.strip().strip("\"'")
    return result


def create_private(path: Path, text: str) -> None:
    with path.open("x") as file:
        file.write(text)
    os.chmod(path, 0o600)


def main() -> None:
    compose_env = ROOT / ".env"
    if not compose_env.exists():
        create_private(
            compose_env,
            "GLOWGUIDE_POSTGRES_PORT=55432\n"
            f"POSTGRES_PASSWORD={secrets.token_urlsafe(32)}\n"
            f"GLOWGUIDE_TEST_DB_PASSWORD={secrets.token_urlsafe(32)}\n",
        )
        print("Created root .env for Docker Compose (private, ignored by Git).")
    values = read_env(compose_env)
    required = ("POSTGRES_PASSWORD", "GLOWGUIDE_TEST_DB_PASSWORD")
    if any(not values.get(key) for key in required):
        raise SystemExit(
            "Set POSTGRES_PASSWORD and GLOWGUIDE_TEST_DB_PASSWORD in the root .env first."
        )
    port = values.get("GLOWGUIDE_POSTGRES_PORT", "55432")
    if not port.isdigit() or not 1 <= int(port) <= 65535:
        raise SystemExit("GLOWGUIDE_POSTGRES_PORT must be a valid port number.")
    backend_env = ROOT / "backend/.env"
    if not backend_env.exists():
        app_password = quote(values["POSTGRES_PASSWORD"], safe="")
        test_password = quote(values["GLOWGUIDE_TEST_DB_PASSWORD"], safe="")
        replacements = {
            "DATABASE_URL": f"postgresql+asyncpg://glowguide:{app_password}@127.0.0.1:{port}/glowguide",
            "TEST_DATABASE_URL": f"postgresql+asyncpg://glowguide_test:{test_password}@127.0.0.1:{port}/glowguide_test",
            "JWT_SECRET": secrets.token_urlsafe(48),
        }
        lines = []
        for line in (ROOT / "backend/.env.example").read_text().splitlines():
            key = line.split("=", 1)[0]
            lines.append(f"{key}={replacements[key]}" if key in replacements else line)
        create_private(backend_env, "\n".join(lines) + "\n")
        print("Created backend/.env with Docker database URLs and a fresh JWT secret.")
    else:
        print("Kept existing backend/.env unchanged.")
    frontend_env = ROOT / "frontend/.env.local"
    if not frontend_env.exists():
        create_private(frontend_env, "BACKEND_URL=http://127.0.0.1:8800\n")
        print("Created frontend/.env.local for the local API proxy.")
    print(f"PostgreSQL: 127.0.0.1:{port}; databases: glowguide and glowguide_test.")


if __name__ == "__main__":
    main()
