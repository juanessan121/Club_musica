# =============================================================================
# Dockerfile - Frontend React (Club de Música)
# =============================================================================
# Autores: Juan Sandoval, Braulio Silva, Javier Herrada
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Build
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

ARG REACT_APP_API_URL=http://localhost:3000/api
ARG REACT_APP_WS_URL=ws://localhost:3000/ws
ARG NODE_ENV=production

ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_WS_URL=$REACT_APP_WS_URL
ENV NODE_ENV=$NODE_ENV

# Copiar dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm ci

# Copiar código fuente
COPY . .

# Build de producción
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 2: Production con Nginx
# -----------------------------------------------------------------------------
FROM nginx:alpine AS production

# Copiar configuración personalizada de nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar build desde builder
COPY --from=builder /app/build /usr/share/nginx/html

# Copiar archivo de configuración de seguridad
COPY nginx-security.conf /etc/nginx/nginx-security.conf 2>/dev/null || true

# Exponer puerto
EXPOSE 3001

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001 || exit 1

# Comando de inicio
CMD ["nginx", "-g", "daemon off;"]

# -----------------------------------------------------------------------------
# Stage: Development (para usar con docker-compose volumes)
# -----------------------------------------------------------------------------
FROM node:20-alpine AS development

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

ARG REACT_APP_API_URL=http://localhost:3000/api
ARG REACT_APP_WS_URL=ws://localhost:3000/ws

ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_WS_URL=$REACT_APP_WS_URL
ENV CHOKIDAR_USEPOLLING=true
ENV WDS_SOCKET_PORT=0

EXPOSE 3001

CMD ["npm", "start"]
