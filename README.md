# Sistema de Gestión — Club de Música

**Autores:** Juan Sandoval, Braulio Silva, Javier Herrada

Plataforma para la gestión del Club de Música Universitario: préstamo de instrumentos, reserva de salas de ensayo, eventos/setlists y membresías de socios.

## Arquitectura

```
                    ┌─────────────────────────────┐
                    │   NGINX (Reverse Proxy)      │
                    │   :8088 (HTTP→HTTPS) :8443   │
                    └──────────────┬────────────────┘
                                   │
                ┌──────────────────┼──────────────────┐
                ▼                                     ▼
      ┌───────────────────┐                 ┌───────────────────┐
      │  Frontend React    │                 │  API Flask         │
      │  :3001              │ ───── HTTP ───▶│  :5000              │
      └───────────────────┘                 └─────────┬─────────┘
                                                         │
                                       ┌─────────────────┼─────────────────┐
                                       ▼                                   ▼
                             ┌─────────────────┐               ┌─────────────────────┐
                             │  MariaDB 10.11   │               │  WhatsApp Bridge      │
                             │  (red interna)    │               │  Node.js (red interna)│
                             └─────────────────┘               └─────────────────────┘
```

Stack real: **Python/Flask + MariaDB + React + Nginx**, con un microservicio Node.js como puente para notificaciones de WhatsApp.

## Requisitos

- [Docker Desktop](https://docs.docker.com/get-docker/) (o Docker Engine + Compose v2 en Linux)
- [Git](https://git-scm.com/)
- En Windows: Git Bash (incluido con Git for Windows) para ejecutar los scripts `.sh`

## Inicio rápido (un solo comando)

```bash
git clone https://github.com/juanessan121/Club_musica.git
cd Club_musica
bash scripts/setup.sh
```

El script `scripts/setup.sh`:
1. Crea `.env` desde `.env.example` con contraseñas y `JWT_SECRET` aleatorios (si no existe ya)
2. Genera un certificado TLS autofirmado de desarrollo
3. Construye y levanta todo el stack con `docker compose up --build -d`

Al terminar, abre **http://localhost:3001**.

## Inicio manual (paso a paso)

```bash
cp .env.example .env
# Edita .env y reemplaza los valores CAMBIAR_* (o genera con openssl rand -hex 32)

bash nginx/gen-cert.sh        # certificado TLS autofirmado de desarrollo

docker compose up --build -d
```

## Acceder a los servicios

| Servicio | URL | Notas |
|---|---|---|
| Frontend (directo) | http://localhost:3001 | Servidor de desarrollo de React, hot-reload |
| Vía Nginx (HTTPS) | https://localhost:8443 | Certificado autofirmado — acepta la advertencia del navegador |
| API health check | http://localhost:5000/api/health | Expuesto para que el frontend dev server lo alcance |
| WhatsApp Bridge | `docker logs club-musica-whatsapp-bridge` | Escanea el código QR desde tu celular para vincular |
| MariaDB | solo red interna Docker | No expuesto al host por seguridad |

## Comandos útiles

```bash
docker compose ps                  # estado de los contenedores
docker compose logs -f <servicio>  # logs en vivo (api-flask, nginx-proxy, web-musica-react, ...)
docker compose down                # detener todo (conserva datos de MariaDB)
docker compose down -v             # detener y borrar también el volumen de MariaDB
docker compose restart <servicio>  # reiniciar un servicio
```

## Testing

```bash
# Backend: pytest (integración) + doctest (helpers puros)
cd api && python -m pytest ../tests/ -v

# Frontend: Vitest
cd frontend && npm run test:vitest
```

## Estructura del proyecto

```
├── api/                    # Backend Flask
│   ├── app.py
│   ├── helpers.py          # funciones puras con doctests
│   ├── Dockerfile          # multi-stage (builder + production), gunicorn, non-root
│   └── requirements.txt
├── frontend/                # Frontend React
│   ├── src/
│   ├── vitest.config.js
│   └── Dockerfile
├── whatsapp-bridge/          # Puente Node.js para WhatsApp
├── nginx/
│   ├── nginx.conf            # TLS, HSTS, CSP, rate limiting
│   └── gen-cert.sh           # genera certificado autofirmado de desarrollo
├── scripts/
│   ├── setup.sh               # onboarding de un solo comando
│   └── init-secrets.sh        # genera secrets/*.txt para despliegues Linux/Swarm
├── tests/                     # pytest (integración) + doctests
├── schema_musica.sql           # esquema MariaDB (se aplica automáticamente al iniciar)
├── docker-compose.yml
├── .env.example
└── .github/workflows/devsecops.yml   # pipeline CI/CD (Bandit, pip-audit, Trivy, etc.)
```

## Endpoints principales de la API

```
GET    /api/health                  # healthcheck
POST   /api/auth/login              # inicio de sesión
POST   /api/auth/register
POST   /api/auth/logout
POST   /api/auth/recover

GET    /api/users                   # socios
GET    /api/instrumentos            # inventario de instrumentos
GET    /api/salas                   # salas de ensayo
GET    /api/reservas                # reservas de salas
GET    /api/prestamos               # préstamos de instrumentos
```

## Seguridad

- Cabeceras de seguridad (HSTS, CSP, X-Frame-Options) vía **Flask-Talisman**
- Cookies de sesión `Secure` + `HttpOnly` + `SameSite=Strict`
- Contraseñas con **bcrypt**; PINs/tokens con `secrets` (CSPRNG)
- Blacklist de tokens JWT revocados persistida en MariaDB (`TOKEN_BLACKLIST`), no en memoria
- Contenedores: `no-new-privileges`, `cap_drop: ALL` (API), `read_only` + `tmpfs` (API y Nginx), límites de CPU/memoria/PIDs
- Pipeline CI/CD con Bandit, pip-audit y Trivy — ver `.github/workflows/devsecops.yml`

**Antes de desplegar en producción real:**
- Reemplaza el certificado autofirmado por uno de Let's Encrypt (ver comentarios en `nginx/nginx.conf` y `nginx/gen-cert.sh`)
- En Linux/Docker Swarm, usa Docker Secrets reales con `scripts/init-secrets.sh` en vez de variables de entorno planas
- Quita los volúmenes de hot-reload (`./api:/app`, `./frontend:/app`) del `docker-compose.yml`

## Solución de problemas

**"Access denied for user 'clubmusica'" en los logs de la API**
El volumen de MariaDB tiene datos de una inicialización anterior con otra contraseña. Reinicia limpio:
```bash
docker compose down -v && docker compose up -d
```

**El frontend no compila / "JavaScript heap out of memory"**
Ya está mitigado con `NODE_OPTIONS=--max-old-space-size=1024` y un límite de memoria de 1.5GB en `docker-compose.yml`. Si persiste, aumenta el límite de memoria asignado a Docker Desktop.

**Login da "Error de servidor" pero la API está healthy**
El frontend (puerto 3001) necesita poder alcanzar la API directamente — confirma que `REACT_APP_API_URL=http://localhost:5000/api` esté en tu `.env` y que el puerto 5000 esté expuesto en `docker-compose.yml`.

**Nginx reinicia en bucle**
Revisa `docker logs club-musica-nginx`. Si falta el certificado TLS, corre `bash nginx/gen-cert.sh` y reinicia el servicio.

## Licencia

MIT — Universidad, Plataforma Club de Música
