#!/usr/bin/env bash
set -euo pipefail

# Runs once when the persistent volume is initialized. The test login owns only the test database.
psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  --set=ON_ERROR_STOP=1 \
  --set=test_password="$GLOWGUIDE_TEST_DB_PASSWORD" <<'SQL'
CREATE ROLE glowguide_test LOGIN PASSWORD :'test_password';
CREATE DATABASE glowguide_test OWNER glowguide_test;
SQL
