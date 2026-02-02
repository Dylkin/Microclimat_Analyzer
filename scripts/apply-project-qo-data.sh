#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SQL_FILE="$ROOT_DIR/supabase/migrations/20260201000000_add_project_qualification_object_data.sql"

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-microclimat}"
DB_USER="${DB_USER:-postgres}"

if [[ ! -f "$SQL_FILE" ]]; then
  echo "SQL file not found: $SQL_FILE" >&2
  exit 1
fi

echo "Applying migration: $SQL_FILE"
psql "host=$DB_HOST port=$DB_PORT dbname=$DB_NAME user=$DB_USER" -f "$SQL_FILE"
echo "Done."
