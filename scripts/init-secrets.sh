#!/usr/bin/env bash
# =============================================================================
# init-secrets.sh — Genera los archivos de Docker Secrets desde el .env local.
#
# Uso:
#   bash scripts/init-secrets.sh
#
# Los archivos se crean en secrets/*.txt.
# El directorio secrets/ está en .gitignore — nunca se commitean.
# =============================================================================
set -euo pipefail

SECRETS_DIR="$(cd "$(dirname "$0")/.." && pwd)/secrets"
ENV_FILE="$(cd "$(dirname "$0")/.." && pwd)/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: No se encontró $ENV_FILE"
  echo "Copia .env.example a .env y rellena los valores antes de continuar."
  exit 1
fi

mkdir -p "$SECRETS_DIR"

# Lee una variable del .env (ignora comentarios y líneas vacías)
get_env() {
  local key="$1"
  grep -E "^${key}=" "$ENV_FILE" | head -1 | cut -d'=' -f2- | tr -d '"' | tr -d "'"
}

DB_ROOT_PWD=$(get_env "DB_ROOT_PASSWORD")
DB_PWD=$(get_env "DB_PASSWORD")
JWT=$(get_env "JWT_SECRET")

if [[ -z "$DB_ROOT_PWD" || -z "$DB_PWD" || -z "$JWT" ]]; then
  echo "ERROR: DB_ROOT_PASSWORD, DB_PASSWORD y JWT_SECRET deben estar definidos en .env"
  exit 1
fi

printf '%s' "$DB_ROOT_PWD" > "$SECRETS_DIR/db_root_password.txt"
printf '%s' "$DB_PWD"      > "$SECRETS_DIR/db_password.txt"
printf '%s' "$JWT"         > "$SECRETS_DIR/jwt_secret.txt"

chmod 600 "$SECRETS_DIR"/*.txt

echo "✓ Archivos de secretos creados en secrets/"
echo "  db_root_password.txt  db_password.txt  jwt_secret.txt"
echo ""
echo "  Estos archivos NO deben commitearse al repositorio."
