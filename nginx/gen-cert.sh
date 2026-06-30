#!/usr/bin/env bash
# =============================================================================
# gen-cert.sh — Genera un certificado TLS autofirmado para DESARROLLO.
# Para PRODUCCIÓN usa Let's Encrypt:
#   docker run --rm -v ./nginx/ssl:/etc/letsencrypt certbot/certbot certonly \
#     --webroot -w /var/www/certbot -d tu-dominio.com
# =============================================================================
set -euo pipefail

# En Git Bash (Windows) MSYS reescribe argumentos que parecen rutas Unix
# (p.ej. "/C=EC/ST=...") anteponiendo "C:/Program Files/Git". Esto lo evita.
# En Linux/macOS esta variable no tiene efecto.
export MSYS_NO_PATHCONV=1

CERT_DIR="$(dirname "$0")/ssl"
mkdir -p "$CERT_DIR"

openssl req -x509 -nodes -days 365 \
  -newkey rsa:2048 \
  -keyout "$CERT_DIR/key.pem" \
  -out    "$CERT_DIR/cert.pem" \
  -subj "/C=EC/ST=Tungurahua/L=Ambato/O=PUCESA/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"

echo "✓ Certificado autofirmado generado en $CERT_DIR"
echo "  cert.pem y key.pem — válidos 365 días solo para desarrollo local."
