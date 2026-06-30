# =============================================================================
# Dockerfile — API Flask (multi-stage, Alpine, non-root)
# =============================================================================
# Stage 1  builder : compila wheels con las herramientas de build.
# Stage 2  production : imagen mínima sin compiladores ni headers.
# Los secretos NUNCA se copian a la imagen; se inyectan en runtime via
# Docker Secrets (/run/secrets/) o variables de entorno.
# =============================================================================

# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 — builder
# ─────────────────────────────────────────────────────────────────────────────
FROM python:3.12-alpine AS builder

# Herramientas de compilación necesarias para bcrypt, PyMySQL, etc.
RUN apk add --no-cache \
        gcc \
        musl-dev \
        libffi-dev \
        mariadb-connector-c-dev

WORKDIR /build
COPY requirements.txt .

# Instala dependencias en un prefijo aislado para copiarlo limpiamente
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 — production
# Solo librerías de runtime; sin gcc ni headers de compilación
# ─────────────────────────────────────────────────────────────────────────────
FROM python:3.12-alpine AS production

# Solo la librería de cliente MariaDB en tiempo de ejecución
RUN apk add --no-cache mariadb-connector-c

# Usuario y grupo sin privilegios (UID/GID 1001)
RUN addgroup -g 1001 -S appgroup && \
    adduser  -S -u 1001 -G appgroup appuser

WORKDIR /app

# Dependencias compiladas desde el stage anterior
COPY --from=builder /install /usr/local

# Código de la aplicación con el propietario correcto
COPY --chown=appuser:appgroup . .

# Cambio al usuario sin privilegios ANTES de cualquier instrucción de runtime
USER appuser

EXPOSE 5000

ENV FLASK_APP=app.py \
    FLASK_ENV=production \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Gunicorn con:
#  --max-requests : recicla workers para evitar memory leaks graduales
#  --access-logfile - : envía logs a stdout (capturados por Docker)
CMD ["gunicorn", \
     "--bind", "0.0.0.0:5000", \
     "--workers", "2", \
     "--worker-class", "sync", \
     "--timeout", "60", \
     "--max-requests", "1000", \
     "--max-requests-jitter", "100", \
     "--access-logfile", "-", \
     "--error-logfile", "-", \
     "app:app"]
