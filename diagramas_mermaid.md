# Diagramas Mermaid - Sistema Club de Música

**Autores:** Juan Sandoval, Braulio Silva, Javier Herrada  
**Fecha:** Abril 2026  
**Versión:** 1.0

---

## Visualización de Diagramas

Este archivo contiene los diagramas en formato Mermaid.js. Puedes visualizarlos en:
- [Mermaid Live Editor](https://mermaid.live/)
- VS Code con la extensión "Markdown Preview Mermaid Support"
- GitHub/GitLab (soporte nativo)
- Convertir a PNG/SVG usando `mmdc` (Mermaid CLI)

---

## 1. Diagrama de Arquitectura de Contenedores

```mermaid
C4Context
    title Sistema Club de Música - Diagrama de Contenedores

    Person_Ext(socio, "Socio del Club", "Músico estudiante que usa el sistema")
    Person_Ext(admin, "Administrador", "Staff que gestiona instrumentos y eventos")
    Person_Ext(coordinador, "Coordinador", "Coordina audiciones y eventos")

    Boundary(b1, "Frontera del Sistema", "borderColor:#333") {
        Container(nginx, "Nginx", "Reverse Proxy", "Nginx<br/>Puerto 80/443", "Reverse proxy, SSL termination, rate limiting")
        
        Container_B(b2, "Aplicaciones", "borderColor:#444") {
            Container(frontend, "Frontend React", "SPA", "React 18 + TypeScript<br/>Puerto 3001", "Interfaz de usuario, calendario de reservas, gestión de préstamos")
            Container(api, "API Node.js", "REST API", "Node.js 20 + Express<br/>Puerto 3000", "Lógica de negocio, autenticación JWT, validaciones")
        }

        Container_B(b3, "Infraestructura de Datos", "borderColor:#444") {
            ContainerDb(postgres, "PostgreSQL", "RDBMS", "PostgreSQL 16<br/>Puerto 5432", "Datos persistentes: socios, instrumentos, reservas, eventos")
            Container(minio, "MinIO", "Object Storage", "S3-Compatible<br/>Puerto 9000", "Partituras PDF, grabaciones de audio, fotos de eventos")
            ContainerDb(redis, "Redis", "Cache", "Redis 7<br/>Puerto 6379", "Cache de consultas, sesiones de usuario, colas de notificaciones")
        }
    }

    Rel(socio, nginx, "HTTPS", "Solicita reservas, consulta instrumentos")
    Rel(admin, nginx, "HTTPS", "Gestiona préstamos, valida devoluciones")
    Rel(coordinador, nginx, "HTTPS", "Aprueba audiciones, crea eventos")

    Rel(nginx, frontend, "Proxy HTTP", "Sirve archivos estáticos")
    Rel(nginx, api, "Proxy HTTP", "/api/* requests")

    Rel(frontend, api, "HTTPS", "Peticiones REST/JSON")
    Rel(api, postgres, "TCP", "Consultas SQL con Sequelize ORM")
    Rel(api, minio, "S3 API", "Upload/download de archivos")
    Rel(api, redis, "TCP", "Cache de consultas frecuentes")

    UpdateRelStyle(socio, nginx, $offsetY="-40")
    UpdateRelStyle(admin, nginx, $offsetY="-20")
    UpdateRelStyle(coordinador, nginx, $offsetY="0")
    UpdateRelStyle(nginx, frontend, $offsetX="-30")
    UpdateRelStyle(nginx, api, $offsetX="30")
    UpdateRelStyle(frontend, api, $offsetY="-30")
    UpdateRelStyle(api, postgres, $offsetX="-40")
    UpdateRelStyle(api, minio, $offsetX="0", $offsetY="30")
    UpdateRelStyle(api, redis, $offsetX="40")

    UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="1")
```

---

## 2. Diagrama Entidad-Relación (ERD)

Basado en `schema_musica.sql`

```mermaid
erDiagram
    %% ========================================================================
    %% TABLAS PRINCIPALES - SOCIOS E INSTRUMENTOS
    %% ========================================================================
    socios {
        integer id PK "Serial, Primary Key"
        uuid uuid UK "UUID único"
        varchar nombre_completo "150 caracteres"
        varchar email UK "100 caracteres, único"
        varchar telefono "20 caracteres"
        varchar instrumento_principal "50 caracteres"
        nivel_habilidad nivel_habilidad "Enum: principiante, intermedio, avanzado, profesional"
        date fecha_nacimiento ""
        timestamp fecha_registro "Default: NOW()"
        date fecha_vencimiento_membresia ""
        estado_socio estado "Enum: activo, bloqueado, suspendido, egresado"
        text observaciones ""
        timestamp created_at ""
        timestamp updated_at ""
    }

    instrumentos {
        integer id PK "Serial, Primary Key"
        uuid uuid UK "UUID único"
        varchar nombre "100 caracteres"
        varchar tipo "50 caracteres: Guitarra, Bajo, etc."
        varchar marca "50 caracteres"
        varchar modelo "50 caracteres"
        varchar numero_serie "50 caracteres"
        date fecha_adquisicion ""
        estado_instrumento estado "Enum: excelente, bueno, regular, dañado, en_mantenimiento, baja"
        varchar ubicacion "100 caracteres"
        decimal precio_compra "10,2"
        date fecha_ultima_mantenencion ""
        text observaciones ""
        timestamp created_at ""
        timestamp updated_at ""
    }

    %% ========================================================================
    %% TABLA DE PRÉSTAMOS (Relación entre Socios e Instrumentos)
    %% ========================================================================
    prestamos {
        integer id PK "Serial, Primary Key"
        uuid uuid UK "UUID único"
        integer socio_id FK "References socios(id)"
        integer instrumento_id FK "References instrumentos(id)"
        timestamp fecha_salida "Default: NOW()"
        timestamp fecha_devolucion "Nullable"
        timestamp fecha_limite "No nullable"
        estado_prestamo estado "Enum: activo, devuelto, vencido, reportado_dañado"
        text observaciones_salida ""
        text observaciones_devolucion ""
        integer responsable_registro FK "References socios(id)"
        timestamp created_at ""
        timestamp updated_at ""
    }

    %% ========================================================================
    %% TABLAS DE SALAS Y RESERVAS
    %% ========================================================================
    salas {
        integer id PK "Serial, Primary Key"
        uuid uuid UK "UUID único"
        varchar nombre "50 caracteres"
        tipo_sala tipo "Enum: cubiculo, salon_acustico, estudio_grabacion"
        integer capacidad "CHECK > 0"
        text equipamiento ""
        varchar estado "Default: activa"
        varchar ubicacion "100 caracteres"
        timestamp created_at ""
        timestamp updated_at ""
    }

    reservas {
        integer id PK "Serial, Primary Key"
        uuid uuid UK "UUID único"
        integer socio_id FK "References socios(id)"
        integer sala_id FK "References salas(id)"
        timestamp fecha_inicio "No nullable"
        timestamp fecha_fin "No nullable, > fecha_inicio"
        estado_reserva estado "Enum: confirmada, cancelada, completada, inasistencia, pendiente"
        text observaciones ""
        timestamp fecha_creacion "Default: NOW()"
        timestamp fecha_cancelacion "Nullable"
        integer cancelada_por FK "References socios(id)"
        text motivo_cancelacion ""
        timestamp created_at ""
        timestamp updated_at ""
    }

    %% ========================================================================
    %% TABLAS DE INASISTENCIAS Y NOTIFICACIONES
    %% ========================================================================
    inasistencias {
        integer id PK "Serial, Primary Key"
        integer socio_id FK "References socios(id) ON DELETE CASCADE"
        integer reserva_id FK "References reservas(id) ON DELETE SET NULL"
        date fecha_inasistencia "Default: CURRENT_DATE"
        boolean justificada "Default: FALSE"
        text justificacion ""
        timestamp created_at ""
    }

    notificaciones {
        integer id PK "Serial, Primary Key"
        uuid uuid UK "UUID único"
        integer socio_id FK "References socios(id)"
        varchar tipo "50 caracteres"
        varchar titulo "150 caracteres"
        text mensaje ""
        boolean leida "Default: FALSE"
        timestamp fecha_envio "Default: NOW()"
        timestamp fecha_lectura "Nullable"
        timestamp created_at ""
    }

    %% ========================================================================
    %% TABLAS DE EVENTOS, BANDAS Y SETLISTS
    %% ========================================================================
    eventos {
        integer id PK "Serial, Primary Key"
        uuid uuid UK "UUID único"
        varchar nombre "100 caracteres"
        text descripcion ""
        timestamp fecha "No nullable"
        varchar lugar "150 caracteres"
        integer responsable_id FK "References socios(id)"
        estado_evento estado "Enum: planificado, en_progreso, finalizado, cancelado"
        integer capacidad_maxima ""
        timestamp created_at ""
        timestamp updated_at ""
    }

    bandas {
        integer id PK "Serial, Primary Key"
        uuid uuid UK "UUID único"
        varchar nombre "100 caracteres"
        varchar genero_musical "50 caracteres"
        integer lider_id FK "References socios(id)"
        date fecha_formacion "Default: CURRENT_DATE"
        text descripcion ""
        varchar estado "Default: activa"
        timestamp created_at ""
        timestamp updated_at ""
    }

    banda_socios {
        integer id PK "Serial, Primary Key"
        integer banda_id FK "References bandas(id) ON DELETE CASCADE"
        integer socio_id FK "References socios(id) ON DELETE RESTRICT"
        rol_banda rol "Enum: fundador, integrante, ex_integrante"
        date fecha_ingreso "Default: CURRENT_DATE"
        date fecha_salida "Nullable"
        timestamp created_at ""
    }

    %% ========================================================================
    %% TABLAS DE REPERTORIO (CANCIONES Y SETLISTS)
    %% ========================================================================
    canciones {
        integer id PK "Serial, Primary Key"
        uuid uuid UK "UUID único"
        varchar titulo "150 caracteres"
        varchar artista "100 caracteres"
        varchar genero "50 caracteres"
        integer duracion_segundos "CHECK > 0"
        varchar tonalidad "10 caracteres"
        varchar partitura_url "500 caracteres"
        varchar grabacion_url "500 caracteres"
        text letra ""
        text acordes ""
        integer dificultad "CHECK 1-5"
        timestamp created_at ""
        timestamp updated_at ""
    }

    setlists {
        integer id PK "Serial, Primary Key"
        uuid uuid UK "UUID único"
        integer evento_id FK "References eventos(id) ON DELETE CASCADE"
        integer banda_id FK "References bandas(id) ON DELETE RESTRICT"
        integer cancion_id FK "References canciones(id) ON DELETE RESTRICT"
        integer orden "CHECK > 0, UNIQUE por evento/banda"
        text notas ""
        timestamp created_at ""
    }

    instrumento_requerido {
        integer id PK "Serial, Primary Key"
        integer cancion_id FK "References canciones(id) ON DELETE CASCADE"
        varchar tipo_instrumento "50 caracteres"
        text especificaciones ""
        boolean obligatorio "Default: TRUE"
        timestamp created_at ""
    }

    %% ========================================================================
    %% RELACIONES
    %% ========================================================================
    
    %% Socios -> Préstamos
    socios ||--o{ prestamos : "realiza (socio_id)"
    instrumentos ||--o{ prestamos : "es prestado en (instrumento_id)"
    
    %% Socios -> Reservas
    socios ||--o{ reservas : "reserva (socio_id)"
    salas ||--o{ reservas : "es reservada en (sala_id)"
    
    %% Socios -> Inasistencias
    socios ||--o{ inasistencias : "tiene (socio_id)"
    reservas ||--o| inasistencias : "genera (reserva_id)"
    
    %% Socios -> Notificaciones
    socios ||--o{ notificaciones : "recibe (socio_id)"
    
    %% Socios -> Bandas
    socios ||--o{ banda_socios : "pertenece (socio_id)"
    bandas ||--o{ banda_socios : "contiene (banda_id)"
    
    %% Socios -> Eventos
    socios ||--o{ eventos : "responsable (responsable_id)"
    
    %% Bandas -> Setlists
    bandas ||--o{ setlists : "presenta (banda_id)"
    eventos ||--o{ setlists : "incluye (evento_id)"
    canciones ||--o{ setlists : "contiene (cancion_id)"
    
    %% Canciones -> Instrumentos Requeridos
    canciones ||--o{ instrumento_requerido : "requiere (cancion_id)"

    %% ========================================================================
    %% ESTILOS
    %% ========================================================================
    classDef primary fill:#4a90d9,stroke:#2c5aa0,color:#fff
    classDef relation fill:#f9a825,stroke:#f57f17,color:#000
    classDef lookup fill:#66bb6a,stroke:#2e7d32,color:#fff
    
    class socios,instrumentos,salas,eventos,bandas,canciones primary
    class prestamos,reservas,banda_socios,setlists relation
    class inasistencias,notificaciones,Instrumento_requerido lookup
```

---

## 3. Diagrama de Flujo de Datos (Data Flow)

```mermaid
flowchart TD
    %% ========================================================================
    %% ACTORES EXTERNOS
    %% ========================================================================
    subgraph EXTERNOS["📱 Actores Externos"]
        SOCIO["👤 Socio<br/>(Navegador Web)"]
        ADMIN["👨‍💼 Administrador<br/>(Navegador Web)"]
    end

    %% ========================================================================
    %% CAPA DE PRESENTACIÓN (NGINX + FRONTEND)
    %% ========================================================================
    subgraph PRESENTACION["🖥️ Capa de Presentación"]
        direction TB
        NGINX["🔄 Nginx<br/>Reverse Proxy<br/>• SSL/TLS Termination<br/>• Rate Limiting<br/>• Load Balancing"]
        
        subgraph FRONTEND["⚛️ Frontend React"]
            direction TB
            COMPONENTS["🧩 Componentes React<br/>• Formulario Reserva<br/>• Calendario<br/>• Lista Instrumentos"]
            STATE["📦 Estado (Zustand)<br/>• Usuario Autenticado<br/>• Reservas Activas<br/>• Notificaciones"]
            SERVICES["🔌 Servicios API<br/>• axios interceptors<br/>• JWT Token Manager<br/>• Error Handler"]
        end
    end

    %% ========================================================================
    %% CAPA DE APLICACIÓN (API NODE.JS)
    %% ========================================================================
    subgraph APLICACION["⚙️ Capa de Aplicación (API Node.js)"]
        direction TB
        ROUTES["🛣️ Routes<br/>• /api/auth/*<br/>• /api/reservas/*<br/>• /api/prestamos/*<br/>• /api/eventos/*"]
        
        subgraph MIDDLEWARE["🛡️ Middleware"]
            AUTH["🔐 Auth Middleware<br/>• JWT Verify<br/>• Role Check"]
            VALIDATE["✅ Validator<br/>• express-validator<br/>• Schema Validation"]
            RATELIMIT["⏱️ Rate Limiter<br/>• 10 req/s general<br/>• 5 req/min auth"]
        end

        subgraph CONTROLLERS["🎮 Controllers"]
            RESERVA_CTRL["ReservaController<br/>• crearReserva()<br/>• cancelarReserva()<br/>• listarDisponibles()"]
            PRESTAMO_CTRL["PrestamoController<br/>• solicitarPrestamo()<br/>• devolverInstrumento()<br/>• historial()"]
        end

        subgraph SERVICES["📜 Services (Lógica de Negocio)"]
            RESERVA_SVC["ReservaService<br/>• validarDisponibilidad()<br/>• verificarSuperposicion()<br/>• checkInasistencias()"]
            PRESTAMO_SVC["PrestamoService<br/>• validarElegibilidad()<br/>• generarHashFirma()<br/>• notificarVencimiento()"]
        end
    end

    %% ========================================================================
    %% CAPA DE DATOS
    %% ========================================================================
    subgraph DATOS["💾 Capa de Datos"]
        direction TB
        subgraph PG["🐘 PostgreSQL 16"]
            TABLAS["📊 Tablas Principales<br/>• socios<br/>• instrumentos<br/>• reservas<br/>• eventos<br/>• bandas<br/>• canciones"]
            TRIGGERS["⚡ Triggers<br/>• validar_superposicion_reserva()<br/>• actualizar_timestamp()<br/>• actualizar_estado_instrumento()"]
            INDEXES["📑 Índices<br/>• idx_reservas_sala_fecha<br/>• idx_prestamos_socio_id<br/>• idx_socios_email"]
        end

        subgraph MINIO["📦 MinIO (Object Storage)"]
            PARTITURAS["🎼 Bucket: partituras<br/>• PDFs de canciones<br/>• Acordes"]
            GRABACIONES["🎵 Bucket: grabaciones<br/>• Audio eventos<br/>• MP3/WAV"]
            FOTOS["📷 Bucket: fotos-eventos<br/>• JPEG/PNG"]
        end

        REDIS["🔴 Redis Cache<br/>• Sesiones de usuario<br/>• Consultas frecuentes<br/>• Colas de notificación"]
    end

    %% ========================================================================
    %% FLUJO DE DATOS - RESERVA DE SALA (Ejemplo Principal)
    %% ========================================================================
    
    %% Paso 1: Solicitud inicial
    SOCIO -->|1. GET /api/reservas/calendario| NGINX
    NGINX -->|2. Proxy a Frontend| FRONTEND
    
    %% Paso 2: Frontend consulta API
    SERVICES -->|3. GET /api/reservas/calendario| ROUTES
    
    %% Paso 3: Middleware
    ROUTES -->|4. Validar JWT| AUTH
    AUTH -->|5. Rate Limit| RATELIMIT
    RATELIMIT -->|6. Validar params| VALIDATE
    
    %% Paso 4: Controller
    VALIDATE -->|7. Ejecutar| RESERVA_CTRL
    
    %% Paso 5: Service
    RESERVA_CTRL -->|8. validarDisponibilidad| RESERVA_SVC
    
    %% Paso 6: Database Query
    RESERVA_SVC -->|9. SELECT con validación| TABLAS
    TABLAS -->|10. Trigger verifica superposición| TRIGGERS
    TRIGGERS -->|11. Usa índices| INDEXES
    INDEXES -->|12. Resultado| RESERVA_SVC
    
    %% Paso 7: Cache (opcional)
    RESERVA_SVC -.->|13. Cache resultado| REDIS
    REDIS -.->|14. Cache hit| RESERVA_SVC
    
    %% Paso 8: Response
    RESERVA_SVC -->|15. JSON disponible| RESERVA_CTRL
    RESERVA_CTRL -->|16. Response| ROUTES
    ROUTES -->|17. JSON| SERVICES
    SERVICES -->|18. JSON| FRONTEND
    FRONTEND -->|19. Render| SOCIO
    
    %% Flujo secundario: Crear reserva
    SOCIO -.->|20. POST /api/reservas| NGINX
    NGINX -.->|21. Proxy| ROUTES
    ROUTES -.->|22. Validar| AUTH
    AUTH -.->|23. Service| RESERVA_SVC
    RESERVA_SVC -.->|24. INSERT reserva| TABLAS
    TABLAS -.->|25. Trigger valida| TRIGGERS
    TRIGGERS -.->|26. Commit| RESERVA_SVC
    RESERVA_SVC -.->|27. Crear notificación| NOTIFICACION_SVC
    
    %% Flujo de archivos (partituras)
    ADMIN -->|28. Upload PDF| NGINX
    NGINX -->|29. POST /api/archivos| ROUTES
    ROUTES -->|30. PutObject| MINIO
    MINIO -->|31. URL pública| ROUTES
    ROUTES -->|32. Guardar URL en DB| TABLAS

    %% ========================================================================
    %% ESTILOS Y CONEXIONES
    %% ========================================================================
    
    classDef externo fill:#e3f2fd,stroke:#1976d2,color:#000
    classDef presentacion fill:#fff3e0,stroke:#f57c00,color:#000
    classDef aplicacion fill:#e8f5e9,stroke:#388e3c,color:#000
    classDef datos fill:#f3e5f5,stroke:#7b1fa2,color:#000
    
    class SOCIO,ADMIN externo
    class NGINX,FRONTEND,COMPONENTS,STATE,SERVICES presentacion
    class ROUTES,MIDDLEWARE,AUTH,VALIDATE,RATELIMIT,CONTROLLERS,RESERVA_CTRL,PRESTAMO_CTRL,SERVICES,RESERVA_SVC,PRESTAMO_SVC aplicacion
    class PG,TABLAS,TRIGGERS,INDEXES,MINIO,PARTITURAS,GRABACIONES,FOTOS,REDIS datos

    %% Leyenda
    subgraph LEYENDA["📖 Leyenda"]
        L1["➡️ Flujo Principal"]
        L2["⤏ Flujo Secundario"]
        L3["⤏ Opcional/Cache"]
    end
```

---

## 4. Diagrama de Secuencia Consolidado - Reserva de Sala

```mermaid
sequenceDiagram
    autonumber
    box "Actor" #e3f2fd
        actor Socio
    end
    box "Frontend (React)" #fff3e0
        participant Calendar as Calendar<br/>Component
        participant API_Service as API<br/>Service
        participant Store as State<br/>Store
    end
    box "API Gateway (Node.js)" #e8f5e9
        participant Router as Express<br/>Router
        participant AuthMW as Auth<br/>Middleware
        participant Validator as Request<br/>Validator
        participant Controller as Reserva<br/>Controller
        participant Service as Reserva<br/>Service
    end
    box "Infraestructura" #f3e5f5
        participant Redis as Redis<br/>Cache
        participant PostgreSQL as PostgreSQL<br/>Database
        participant TriggerDB as Trigger<br/>validar_superposicion
        participant NotifService as Notification<br/>Service
    end

    %% Fase 1: Consulta de disponibilidad
    Socio->>Calendar: Selecciona rango<br/>de fechas
    Calendar->>API_Service: getDisponibilidad<br/>(fechaInicio, fechaFin)
    API_Service->>Store: Verificar cache local
    Store-->>API_Service: No hay datos cacheados
    
    API_Service->>Router: GET /api/reservas/calendario?<br/>inicio=X&fin=Y
    Router->>AuthMW: Verificar JWT token
    AuthMW->>AuthMW: jwt.verify(token, secret)
    AuthMW-->>Router: Usuario autenticado
    
    Router->>Validator: Validar query params
    Validator-->>Controller: Params válidos
    
    Controller->>Service: listarDisponibles<br/>(fechaInicio, fechaFin)
    Service->>Redis: GET cache:reservas:inicio:fin
    Redis-->>Service: Cache miss (null)
    
    Service->>PostgreSQL: SELECT FROM reservas<br/>WHERE estado IN ('confirmada')<br/>AND fecha_inicio BETWEEN ?
    PostgreSQL->>TriggerDB: After SELECT hook
    TriggerDB-->>PostgreSQL: No action (read only)
    PostgreSQL-->>Service: Array de reservas ocupadas
    
    Service->>Service: Calcular slots disponibles
    Service->>Redis: SETEX cache:reservas 300s JSON
    Redis-->>Service: OK
    
    Service-->>Controller: JSON con horarios disponibles
    Controller-->>Router: Response 200 OK
    Router-->>API_Service: {disponibles: [...]}
    API_Service->>Store: Actualizar cache local
    API_Service-->>Calendar: Renderizar calendario
    Calendar-->>Socio: Mostrar slots verdes/rojos

    %% Fase 2: Crear reserva
    Socio->>Calendar: Click en slot<br/>disponible
    Calendar->>Socio: Confirmar reserva?
    Socio->>Calendar: Confirmar
    
    Calendar->>API_Service: POST /api/reservas<br/>{salaId, inicio, fin}
    API_Service->>Router: POST con JWT header
    Router->>AuthMW: Validar token
    AuthMW-->>Router: OK - socioId=123
    
    Router->>Validator: Validar body request
    Validator->>Validator: schema.validate({salaId, inicio, fin})
    Validator-->>Controller: Validación exitosa
    
    Controller->>Service: crearReserva<br/>(socioId, salaId, inicio, fin)
    Service->>Service: validarElegibilidad(socioId)
    Service->>PostgreSQL: SELECT COUNT(*) FROM reservas<br/>WHERE socio_id=? AND<br/>fecha_inicio BETWEEN NOW()-7d AND NOW()
    PostgreSQL-->>Service: count=2 (< 3 limite)
    
    Service->>PostgreSQL: BEGIN TRANSACTION
    
    Service->>PostgreSQL: INSERT INTO reservas<br/>(socio_id, sala_id, fecha_inicio,<br/>fecha_fin, estado)
    PostgreSQL->>TriggerDB: BEFORE INSERT trigger
    TriggerDB->>TriggerDB: validar_superposicion_reserva()
    TriggerDB->>PostgreSQL: SELECT FROM reservas<br/>WHERE sala_id=? AND<br/>estado IN ('confirmada','pendente')<br/>AND (superposición)
    PostgreSQL-->>TriggerDB: No hay superposición
    TriggerDB-->>PostgreSQL: ALLOW INSERT
    PostgreSQL-->>Service: ID=456 creado
    
    Service->>PostgreSQL: COMMIT
    PostgreSQL-->>Service: Transaction OK
    
    Service->>NotifService: programarRecordatorio<br/>(reservaId, 24h)
    NotifService->>PostgreSQL: INSERT INTO notificaciones<br/>(socio_id, tipo, titulo, mensaje,<br/>fecha_envio)
    PostgreSQL-->>NotifService: Notificación creada
    
    Service-->>Controller: Reserva creada con éxito
    Controller-->>Router: Response 201 Created
    Router-->>API_Service: {id: 456, uuid: "..."}
    API_Service-->>Calendar: Reserva confirmada
    Calendar->>Store: Agregar a reservasActivas
    Calendar-->>Socio: Mostrar comprobante
```

---

## 5. Diagrama de Despliegue (Deployment)

```mermaid
flowchart TB
    subgraph INTERNET["🌐 Internet"]
        USERS["👥 Usuarios<br/>(Socios, Administradores)"]
    end

    subgraph DOCKER_HOST["🖥️ Docker Host<br/>(Ubuntu Server 24.04)"]
        direction TB
        
        subgraph NETWORK["🔗 Docker Network<br/>172.28.0.0/16"]
            direction LR
            
            subgraph PROXY["🔄 Reverse Proxy"]
                NGINX["Nginx<br/>Puertos: 80, 443<br/>Resources: 0.5 CPU, 256MB"]
            end
            
            subgraph APPS["📦 Aplicaciones"]
                FRONTEND["React App<br/>Puerto: 3001<br/>Resources: 0.5 CPU, 512MB"]
                API["Node.js API<br/>Puerto: 3000<br/>Resources: 1.0 CPU, 1GB"]
            end
            
            subgraph DATA["💾 Datos"]
                POSTGRES["PostgreSQL 16<br/>Puerto: 5432<br/>Resources: 2.0 CPU, 2GB<br/>Volumen: postgres_data"]
                MINIO["MinIO<br/>Puertos: 9000, 9001<br/>Resources: 1.0 CPU, 1GB<br/>Volumen: minio_data"]
                REDIS["Redis 7<br/>Puerto: 6379<br/>Resources: 0.5 CPU, 256MB<br/>Volumen: redis_data"]
            end
            
            subgraph ADMIN["🛠️ Administración (Dev)"]
                PGADMIN["PGAdmin 4<br/>Puerto: 8080<br/>Resources: 0.5 CPU, 512MB"]
            end
        end
    end

    subgraph STORAGE["💿 Persistent Storage"]
        VOLUMES["📁 Docker Volumes<br/>• postgres_data<br/>• minio_data<br/>• redis_data<br/>• pgadmin_data<br/>• api_logs<br/>• nginx_logs"]
    end

    %% Conexiones
    USERS -->|HTTPS 443| NGINX
    USERS -->|HTTP 80 | NGINX
    
    NGINX -->|Proxy Pass| FRONTEND
    NGINX -->|Proxy Pass /api/*| API
    
    FRONTEND -->|HTTP 3000| API
    API -->|TCP 5432| POSTGRES
    API -->|TCP 9000| MINIO
    API -->|TCP 6379| REDIS
    
    POSTGRES -->|Mount| VOLUMES
    MINIO -->|Mount| VOLUMES
    REDIS -->|Mount| VOLUMES
    PGADMIN -->|Mount| VOLUMES

    %% Estilos
    classDef internet fill:#e3f2fd,stroke:#1976d2,color:#000
    classDef host fill:#f5f5f5,stroke:#616161,color:#000
    classDef network fill:#fff3e0,stroke:#f57c00,color:#000
    classDef proxy fill:#ffebee,stroke:#c62828,color:#000
    classDef apps fill:#e8f5e9,stroke:#2e7d32,color:#000
    classDef data fill:#f3e5f5,stroke:#7b1fa2,color:#000
    classDef admin fill:#fff8e1,stroke:#f9a825,color:#000
    classDef storage fill:#eceff1,stroke:#546e7a,color:#000

    class USERS,INTERNET internet
    class DOCKER_HOST host
    class NETWORK network
    class NGINX proxy
    class FRONTEND,API apps
    class POSTGRES,MINIO,REDIS data
    class PGADMIN admin
    class VOLUMES,STORAGE storage
```

---

## Instrucciones de Uso

### Visualizar en Mermaid Live Editor

1. Copia cualquier diagrama de arriba
2. Ve a https://mermaid.live/
3. Pega el código en el editor
4. Exporta como PNG, SVG o PDF

### Convertir con Mermaid CLI

```bash
# Instalar Mermaid CLI
npm install -g @mermaid-js/mermaid-cli

# Convertir a PNG
mmdc -i diagrama.mmd -o diagrama.png -w 1920 -H 1080

# Convertir a SVG
mmdc -i diagrama.mmd -o diagrama.svg
```

### Incrustar en Markdown (GitHub/GitLab)

```markdown
```mermaid
[Pega el diagrama aquí]
```
```

---

*Documento de diagramas Mermaid para el Sistema del Club de Música*  
*Autores: Juan Sandoval, Braulio Silva, Javier Herrada*
