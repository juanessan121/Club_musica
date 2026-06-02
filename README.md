# Plataforma Club de Música

Este proyecto fue refactorizado para utilizar **Python (Flask)**, **MariaDB** y **React**, junto con un microservicio puente para notificaciones de **WhatsApp**.

## Requisitos
- [Docker](https://docs.docker.com/get-docker/) y [Docker Compose](https://docs.docker.com/compose/install/) instalados.
- [Git](https://git-scm.com/)

## Cómo levantar el entorno (Desarrollo)

1. **Clonar el repositorio:**
   ```bash
   git clone[ https://github.com/TU_USUARIO/NOMBRE_DEL_REPO.git](https://github.com/juanessan121/Club_musica/tree/main)
   cd "Plataforma club de musica"
2.
Copiar las variables de entorno:
cp .env.example .env
(Asegúrate de llenar en el .env las credenciales requeridas, como la base de datos o cuentas de correo si planean probarlas localmente).
3.
Levantar los servicios con Docker Compose:
docker compose up --build -d
4.
Verificar los servicios:
◦
Frontend (React): Abre tu navegador en http://localhost:3001
◦
Backend API (Flask): Disponible en http://localhost:5000/api/health
◦
WhatsApp Bridge: Ve los logs con docker logs club-musica-whatsapp-bridge para escanear el código QR desde tu celular.
◦
Base de Datos (MariaDB): Disponible en el puerto 3306. La base de datos y las tablas de prueba se inicializan automáticamente con schema_musica.sql.
Detener el entorno
Para detener el proyecto y apagar los contenedores, ejecuta:
docker compose down
(Tus datos de MariaDB persistirán en un volumen local)
# Sistema de Gestión - Club de Música

**Autores:** Juan Sandoval, Braulio Silva, Javier Herrada  
**Versión:** 1.0  
**Fecha:** Abril 2026

## Descripción

Plataforma integral para la gestión del Club de Música Universitario, incluyendo:

- **Préstamo de instrumentos** con control de estado y firma digital de responsabilidad
- **Reserva de salas de ensayo** con validación de disponibilidad en tiempo real
- **Gestión de eventos y setlists** para presentaciones musicales
- **Membresías y audiciones** para registro de nuevos socios

## Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                         NGINX (Reverse Proxy)                    │
│                         Puerto 80/443                            │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┴─────────────────────┐
        │                                           │
        ▼                                           ▼
┌───────────────────┐                     ┌───────────────────┐
│   Frontend React  │                     │    API Node.js    │
│   Puerto 3001     │                     │    Puerto 3000    │
└───────────────────┘                     └───────────────────┘
                                                   │
                    ┌──────────────────────────────┼──────────────┐
                    │                              │              │
                    ▼                              ▼              ▼
          ┌─────────────────┐            ┌─────────────────┐  ┌──────────┐
          │  PostgreSQL 16  │            │   MinIO (S3)    │  │  Redis   │
          │  Puerto 5432    │            │  Puerto 9000    │  │  6379    │
          └─────────────────┘            └─────────────────┘  └──────────┘
```

## Requisitos

- Docker 20.10+
- Docker Compose 2.0+
- 4GB RAM mínimo (8GB recomendado)
- 20GB espacio en disco

## Inicio Rápido

### 1. Clonar y configurar

```bash
cd "Plataforma club de musica"
cp .env.example .env
```

### 2. Ajustar variables de entorno

Editar `.env` y cambiar:
- `JWT_SECRET` por un valor seguro
- `MINIO_SECRET_KEY` por un valor seguro
- Credenciales SMTP si se usan notificaciones por email

### 3. Levantar servicios

```bash
# Modo desarrollo (con PGAdmin)
docker-compose --profile dev up -d

# Modo producción (con Nginx)
docker-compose --profile prod up -d

# Ver logs
docker-compose logs -f
```

### 4. Acceder a los servicios

| Servicio | URL | Credenciales |
|----------|-----|--------------|
| Frontend | http://localhost:3001 | - |
| API | http://localhost:3000/api | - |
| API Health | http://localhost:3000/api/health | - |
| MinIO Console | http://localhost:9001 | minioadmin / minioadmin_secret |
| PGAdmin (dev) | http://localhost:8080 | admin@clubmusica.cl / pgadmin_secret_2026 |

## Estructura del Proyecto

```
Plataforma club de musica/
├── api/                          # Backend Node.js
│   ├── Dockerfile
│   ├── package.json
│   ├── src/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   └── index.ts
│   └── logs/
├── frontend/                     # Frontend React
│   ├── Dockerfile
│   ├── package.json
│   ├── public/
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── hooks/
│       └── services/
├── nginx/                        # Configuración Nginx
│   ├── nginx.conf
│   └── conf.d/
├── backups/                      # Backups de PostgreSQL
├── schema_musica.sql             # Script de base de datos
├── docker-compose.yml            # Orquestación Docker
├── .env.example                  # Variables de entorno ejemplo
├── arquitectura_club_musica.md   # Documento de arquitectura
├── secuencias_musica.md          # Diagramas de secuencia
└── README.md                     # Este archivo
```

## Endpoints de la API

### Autenticación
```
POST   /api/auth/register       # Registro de nuevo socio
POST   /api/auth/login          # Inicio de sesión
POST   /api/auth/refresh        # Refrescar token
POST   /api/auth/logout         # Cerrar sesión
```

### Socios
```
GET    /api/socios              # Listar socios
GET    /api/socios/:id          # Obtener socio
POST   /api/socios              # Crear socio
PUT    /api/socios/:id          # Actualizar socio
DELETE /api/socios/:id          # Eliminar socio
```

### Instrumentos
```
GET    /api/instrumentos              # Listar instrumentos
GET    /api/instrumentos/disponibles  # Listar disponibles
GET    /api/instrumentos/:id          # Obtener instrumento
POST   /api/instrumentos              # Crear instrumento
PUT    /api/instrumentos/:id          # Actualizar instrumento
```

### Préstamos
```
GET    /api/prestamos              # Listar préstamos
GET    /api/prestamos/activos      # Préstamos activos
POST   /api/prestamos/solicitar    # Solicitar préstamo
POST   /api/prestamos/:id/devolver # Devolver instrumento
```

### Reservas
```
GET    /api/reservas/calendario    # Calendario de reservas
GET    /api/reservas               # Listar reservas
POST   /api/reservas/validar       # Validar disponibilidad
POST   /api/reservas               # Crear reserva
DELETE /api/reservas/:id           # Cancelar reserva
```

### Eventos
```
GET    /api/eventos              # Listar eventos
GET    /api/eventos/:id          # Obtener evento
POST   /api/eventos              # Crear evento
POST   /api/eventos/:id/setlist  # Asignar setlist
```

## Comandos Útiles

```bash
# Ver estado de servicios
docker-compose ps

# Ver logs de un servicio
docker-compose logs api-musica-node
docker-compose logs db-postgres

# Reiniciar un servicio
docker-compose restart api-musica-node

# Detener todos los servicios
docker-compose down

# Detener y eliminar volúmenes (¡cuidado!)
docker-compose down -v

# Ejecutar migraciones
docker-compose exec api-musica-node npm run migrate

# Ver logs de base de datos
docker-compose exec db-postgres psql -U clubmusica -d club_musica -c "SELECT * FROM socios LIMIT 5;"
```

## Desarrollo

### Backend (API)

```bash
cd api
npm install
npm run dev
```

### Frontend (React)

```bash
cd frontend
npm install
npm start
```

## Base de Datos

El script `schema_musica.sql` se ejecuta automáticamente al iniciar el contenedor de PostgreSQL por primera vez.

### Conexión directa

```bash
docker-compose exec db-postgres psql -U clubmusica -d club_musica
```

### Realizar backup

```bash
docker-compose exec db-postgres pg_dump -U clubmusica club_musica > backups/backup_$(date +%Y%m%d).sql
```

### Restaurar backup

```bash
docker-compose exec -T db-postgres psql -U clubmusica -d club_musica < backups/backup_YYYYMMDD.sql
```

## Seguridad

- Cambiar todas las contraseñas por defecto en `.env`
- Usar HTTPS en producción (configurar certificados en nginx/)
- Habilitar rate limiting para endpoints críticos
- Rotar JWT_SECRET periódicamente

## Licencia

MIT - Universidad, Plataforma Club de Música
