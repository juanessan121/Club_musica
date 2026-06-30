#!/usr/bin/env bash
# =============================================================================
# setup.sh — Onboarding de un solo comando para un colaborador nuevo.
#
# Uso (desde la raíz del repo o desde cualquier lado):
#   bash scripts/setup.sh
#
# Funciona en Linux, macOS y Windows (Git Bash). Requiere Docker Desktop /
# Docker Engine + Docker Compose v2 instalados y corriendo.
#
# Hace, en orden:
#   1. Crea .env desde .env.example con secretos aleatorios (si no existe ya).
#   2. Genera el certificado TLS de desarrollo (si no existe ya).
#   3. Construye y levanta todo el stack con Docker Compose.
# =============================================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

# ── 1. .env ───────────────────────────────────────────────────────────────
if [[ ! -f .env ]]; then
  echo "→ Creando .env desde .env.example con secretos aleatorios..."
  cp .env.example .env

  if ! command -v openssl >/dev/null 2>&1; then
    echo "ERROR: openssl no está disponible. Instálalo o rellena .env manualmente."
    exit 1
  fi

  DB_ROOT_PWD=$(openssl rand -base64 24 | tr -d '/+=')
  DB_PWD=$(openssl rand -base64 24 | tr -d '/+=')
  JWT=$(openssl rand -hex 32)

  sed -i.bak "s|^DB_ROOT_PASSWORD=.*|DB_ROOT_PASSWORD=${DB_ROOT_PWD}|" .env
  sed -i.bak "s|^DB_PASSWORD=.*|DB_PASSWORD=${DB_PWD}|" .env
  sed -i.bak "s|^JWT_SECRET=.*|JWT_SECRET=${JWT}|" .env
  rm -f .env.bak

  echo "  ✓ .env creado con contraseñas y JWT_SECRET aleatorios (32+ caracteres)."
else
  echo "→ .env ya existe — no se modifica. Bórralo si quieres regenerar secretos."
fi

# ── 2. Certificado TLS de desarrollo ────────────────────────────────────────
if [[ ! -f nginx/ssl/cert.pem || ! -f nginx/ssl/key.pem ]]; then
  echo "→ Generando certificado TLS autofirmado para desarrollo..."
  bash nginx/gen-cert.sh
else
  echo "→ Certificado TLS ya existe — no se regenera."
fi

# ── 3. Levantar el stack ─────────────────────────────────────────────────────
echo "→ Construyendo y levantando los contenedores (la primera vez tarda varios minutos)..."
docker compose up --build -d

echo ""
echo "✓ Stack levantado. Verifica el estado con: docker compose ps"
echo ""
echo "  Frontend directo  : http://localhost:3001"
echo "  Vía Nginx (HTTPS)  : https://localhost:8443   (certificado autofirmado: acepta la advertencia del navegador)"
echo "  API health check   : http://localhost:5000/api/health"
echo ""
echo "  Si la BD fue inicializada antes con otra contraseña y el login falla con"
echo "  'Access denied', borra el volumen y vuelve a levantar:"
echo "    docker compose down -v && docker compose up -d"
