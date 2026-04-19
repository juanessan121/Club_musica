# Diagramas de Secuencia - Sistema Club de Música

**Autores:** Juan Sandoval, Braulio Silva, Javier Herrada  
**Fecha:** Abril 2026

---

## 1. Proceso de Audición y Registro de Nuevo Miembro

Este diagrama muestra el flujo completo desde que un interesado solicita unirse al club hasta que se completa su registro como socio activo.

```mermaid
sequenceDiagram
    autonumber
    actor Interesado
    participant Frontend as Frontend<br/>(React)
    participant API as API Gateway<br/>(Node.js)
    participant Auth as Servicio<br/>Autenticación
    participant DB as PostgreSQL<br/>Database
    participant Coordinador as Coordinador<br/>Audiciones

    Interesado->>Frontend: Solicita formulario<br/>de inscripción
    Frontend->>API: GET /api/audiciones/formulario
    API->>DB: Consulta requisitos<br/>de audición
    DB-->>API: Retorna requisitos
    API-->>Frontend: JSON con requisitos
    Frontend-->>Interesado: Muestra formulario

    Interesado->>Frontend: Completa datos<br/>personales
    Frontend->>API: POST /api/audiciones/solicitud
    API->>Auth: Valida email único
    Auth->>DB: SELECT FROM socios<br/>WHERE email = ?
    DB-->>Auth: Email disponible
    Auth-->>API: Validación exitosa

    API->>DB: INSERT INTO solicitudes_audicion<br/>(datos interesado)
    DB-->>API: ID solicitud creado
    API-->>Frontend: Confirmación + ID
    Frontend-->>Interesado: Solicitud registrada<br/>"Te contactaremos"

    API->>Coordinador: Notifica nueva<br/>solicitud (email/webhook)
    
    Note over Coordinador: Revisa solicitudes<br/>pendientes

    Coordinador->>API: GET /api/audiciones/pendientes
    API->>DB: SELECT solicitudes<br/>WHERE estado = 'pendiente'
    DB-->>API: Lista de solicitudes
    API-->>Coordinador: Retorna lista

    Coordinador->>API: POST /api/audiciones/:id/agendar
    API->>DB: UPDATE solicitudes<br/>SET fecha_audicion, estado='agendada'
    DB-->>API: Actualización exitosa
    API->>Interesado: Envía email<br/>con fecha de audición

    Note over Interesado, Coordinador: Día de la audición

    Coordinador->>API: POST /api/audiciones/:id/evaluar
    API->>DB: BEGIN TRANSACTION

    API->>DB: INSERT INTO socios<br/>(datos + nivel_habilidad)
    DB-->>API: ID socio creado

    API->>DB: UPDATE solicitudes<br/>SET estado='aprobada'
    DB-->>API: Actualización exitosa

    API->>DB: COMMIT
    DB-->>API: Transacción completada

    API->>Interesado: Envía email<br/>"¡Bienvenido al club!"
    API-->>Frontend: Registro completado
    Frontend-->>Coordinador: Notificación éxito

    alt Audición desaprobada
        Coordinador->>API: POST /api/audiciones/:id/rechazar
        API->>DB: UPDATE solicitudes<br/>SET estado='rechazada'
        DB-->>API: Actualización
        API->>Interesado: Envía email<br/>de agradecimiento
    end
```

### Descripción del Flujo

| Paso | Actor | Acción |
|------|-------|--------|
| 1-4 | Interesado | Solicita y completa formulario de inscripción |
| 5-8 | API + Auth | Valida que el email no esté registrado previamente |
| 9-12 | API + DB | Crea solicitud de audición en estado pendiente |
| 13-17 | Coordinador | Revisa solicitudes pendientes y agenda audición |
| 18-22 | Coordinador + API | Evalúa audición y crea socio si es aprobado |
| 23 | Sistema | Envía email de bienvenida con credenciales |

### Reglas de Negocio Aplicadas

- **RN-01:** El email debe ser único en el sistema
- **RN-02:** Toda audición debe ser agendada por el coordinador
- **RN-03:** El nivel de habilidad se determina en la audición
- **RN-04:** Socio aprobado recibe credenciales de acceso automáticamente

---

## 2. Flujo de Préstamo de Instrumento con Firma Digital de Responsabilidad

Este diagrama muestra el proceso de préstamo de un instrumento, incluyendo la validación de elegibilidad del socio, verificación del instrumento y la firma digital de responsabilidad.

```mermaid
sequenceDiagram
    autonumber
    actor Socio
    participant Frontend as Frontend<br/>(React)
    participant API as API Gateway<br/>(Node.js)
    participant Prestamos as Servicio<br/>Préstamos
    participant Socios as Servicio<br/>Socios
    participant Instrumentos as Servicio<br/>Instrumentos
    participant DB as PostgreSQL<br/>Database
    participant Firma as Servicio<br/>Firma Digital
    participant Admin as Administrador<br/>de Instrumentos

    Socio->>Frontend: Solicita préstamo<br/>de instrumento
    Frontend->>API: GET /api/prestamos/disponibles
    API->>Instrumentos: Consulta instrumentos<br/>disponibles
    Instrumentos->>DB: SELECT FROM instrumentos<br/>WHERE estado IN ('excelente','bueno')
    DB-->>Instrumentos: Lista de instrumentos
    Instrumentos-->>API: Retorna disponibles
    API-->>Frontend: JSON instrumentos
    Frontend-->>Socio: Muestra catálogo

    Socio->>Frontend: Selecciona instrumento
    Frontend->>API: POST /api/prestamos/solicitar
    API->>Socios: Valida estado del socio

    Socios->>DB: SELECT FROM socios<br/>WHERE id = ?
    DB-->>Socios: Datos del socio
    Socios->>DB: SELECT COUNT(*) FROM prestamos<br/>WHERE socio_id = ? AND estado = 'activo'
    DB-->>Socios: Préstamos activos

    alt Socio tiene préstamos vencidos
        Socios-->>API: Error: Socio bloqueado
        API-->>Frontend: Error 403<br/>"Préstamo vencido"
        Frontend-->>Socio: Notifica bloqueo
    else Socio elegible
        Socios-->>API: Socio elegible

        API->>Instrumentos: Verifica disponibilidad<br/>en tiempo real
        Instrumentos->>DB: SELECT estado FROM instrumentos<br/>WHERE id = ? FOR UPDATE
        DB-->>Instrumentos: Estado actual
        Instrumentos-->>API: Instrumento disponible

        API->>Frontend: Solicita confirmación<br/>y muestra términos
        Frontend-->>Socio: Muestra términos de<br/>responsabilidad

        Socio->>Frontend: Acepta términos

        Frontend->>API: POST /api/prestamos/confirmar
        API->>Firma: Genera hash de<br/>responsabilidad
        Firma->>Firma: Crea hash SHA-256<br/>(socio_id, instrumento_id,<br/>fecha, términos)
        Firma-->>API: Retorna hash + timestamp

        API->>DB: BEGIN TRANSACTION

        API->>DB: INSERT INTO prestamos<br/>(socio_id, instrumento_id,<br/>fecha_salida, fecha_limite,<br/>hash_responsabilidad)
        DB-->>API: ID préstamo creado

        API->>DB: UPDATE instrumentos<br/>SET estado = 'en_mantenimiento'<br/>WHERE id = ?
        DB-->>API: Instrumento actualizado

        API->>DB: INSERT INTO notificaciones<br/>(socio_id, tipo='recordatorio_devolucion')
        DB-->>API: Notificación creada

        API->>DB: COMMIT
        DB-->>API: Transacción completada

        API->>Frontend: Confirmación +<br/>código de préstamo
        Frontend-->>Socio: Muestra comprobante

        API->>Admin: Notifica préstamo<br/>registrado (webhook)

        Note over Socio, Admin: Retiro físico del instrumento

        Admin->>API: POST /api/prestamos/:id/entregar
        Admin->>DB: UPDATE prestamos<br/>SET observaciones_salida,<br/>foto_estado_inicial
        DB-->>Admin: Confirmación

        Admin->>Socio: Entrega instrumento<br/>físicamente
    end

    Note over Socio, DB: Día de devolución

    Socio->>Admin: Devuelve instrumento
    Admin->>API: POST /api/prestamos/:id/devolver
    API->>Instrumentos: Valida estado del<br/>instrumento

    Admin->>API: Reporta estado físico
    API->>DB: BEGIN TRANSACTION

    alt Instrumento dañado
        API->>DB: UPDATE instrumentos<br/>SET estado = 'dañado'
        API->>DB: UPDATE prestamos<br/>SET estado = 'reportado_dañado',<br/>observaciones_devolucion = ?
    else Instrumento en buen estado
        API->>DB: UPDATE instrumentos<br/>SET estado = 'excelente'
        API->>DB: UPDATE prestamos<br/>SET estado = 'devuelto',<br/>fecha_devolucion = NOW()
    end

    API->>DB: COMMIT
    DB-->>API: Transacción completada
    API-->>Admin: Devolución registrada
    Admin-->>Socio: Confirma devolución
```

### Descripción del Flujo

| Paso | Actor | Acción |
|------|-------|--------|
| 1-5 | Socio + API | Consulta instrumentos disponibles |
| 6-10 | API + Socios | Valida elegibilidad del socio (sin préstamos vencidos) |
| 11-14 | API + Instrumentos | Verifica disponibilidad en tiempo real con lock |
| 15-18 | Sistema | Genera hash SHA-256 como firma digital de responsabilidad |
| 19-25 | API + DB | Crea préstamo en transacción atómica |
| 26-28 | Admin + Socio | Entrega física con registro de estado inicial |
| 29-35 | Admin + API | Proceso de devolución con validación de estado |

### Componentes de la Firma Digital

```
hash_responsabilidad = SHA-256(
    socio_id ||
    instrumento_id ||
    fecha_salida ||
    fecha_limite ||
    terminos_version ||
    salt_secreto
)
```

### Reglas de Negocio Aplicadas

- **RN-01:** Socio con préstamo vencido no puede solicitar nuevos préstamos
- **RN-02:** El hash de responsabilidad se genera al momento de confirmar
- **RN-03:** El instrumento se marca como "en_mantenimiento" durante el préstamo
- **RN-04:** La devolución requiere validación física del administrador
- **RN-05:** Instrumento dañado genera reporte automático y bloqueo de socio

### Estructura del Hash de Responsabilidad

| Campo | Tipo | Descripción |
|-------|------|-------------|
| socio_id | UUID | Identificador único del socio |
| instrumento_id | UUID | Identificador único del instrumento |
| fecha_salida | TIMESTAMP | Fecha y hora exacta de salida |
| fecha_limite | TIMESTAMP | Fecha límite de devolución |
| terminos_version | VARCHAR | Versión de términos aceptados |
| salt_secreto | VARCHAR | Salt del sistema para integridad |

---

## 3. Flujo de Reserva de Sala con Validación de Disponibilidad

```mermaid
sequenceDiagram
    autonumber
    actor Socio
    participant Frontend as Frontend<br/>(React Calendar)
    participant API as API Gateway<br/>(Node.js)
    participant Reservas as Servicio<br/>Reservas
    participant Validador as Validador<br/>Horarios
    participant DB as PostgreSQL<br/>Database
    participant Notif as Servicio<br/>Notificaciones

    Socio->>Frontend: Accede a calendario<br/>de reservas
    Frontend->>API: GET /api/reservas/calendario?<br/>fecha_inicio&fecha_fin
    API->>Reservas: Consulta reservas<br/>del período
    Reservas->>DB: SELECT FROM reservas<br/>WHERE estado IN ('confirmada','pendiente')<br/>AND fecha_inicio BETWEEN ?
    DB-->>Reservas: Reservas existentes
    Reservas-->>API: Lista de reservas
    API-->>Frontend: JSON con horarios ocupados
    Frontend-->>Socio: Muestra calendario<br/>con slots disponibles

    Socio->>Frontend: Selecciona fecha y hora
    Frontend->>API: POST /api/reservas/validar-disponibilidad
    API->>Validador: Valida disponibilidad<br/>de sala y socio

    Validador->>DB: SELECT FROM reservas<br/>WHERE sala_id = ?<br/>AND ((fecha_inicio <= ? AND fecha_fin > ?)<br/>OR (fecha_inicio < ? AND fecha_fin >= ?))
    DB-->>Validador: Verifica superposición

    Validador->>DB: SELECT COUNT(*) FROM reservas<br/>WHERE socio_id = ?<br/>AND fecha_inicio BETWEEN<br/>NOW() - INTERVAL '7 days' AND NOW()
    DB-->>Validador: Reservas semanales

    Validador->>DB: SELECT contar_inasistencias_socio(?)
    DB-->>Validador: Inasistencias (90 días)

    alt Socio con 3+ inasistencias
        Validador-->>API: Error: Socio sancionado
        API-->>Frontend: Error 403<br/>"Sanción por inasistencias"
        Frontend-->>Socio: Notifica sanción
    else Socio excede límite semanal
        Validador-->>API: Error: Límite alcanzado
        API-->>Frontend: Error 400<br/>"Máximo 3 reservas/semana"
        Frontend-->>Socio: Notifica límite
    else Sala no disponible
        Validador-->>API: Error: Sala ocupada
        API-->>Frontend: Error 409<br/>"Horario no disponible"
        Frontend-->>Socio: Sugiere horarios alternativos
    else Disponible
        Validador-->>API: OK - Disponible

        API->>Frontend: Confirma disponibilidad
        Frontend->>Socio: Pide confirmación

        Socio->>Frontend: Confirma reserva
        Frontend->>API: POST /api/reservas/crear

        API->>DB: BEGIN TRANSACTION

        API->>DB: INSERT INTO reservas<br/>(socio_id, sala_id,<br/>fecha_inicio, fecha_fin,<br/>estado = 'pendiente')
        DB-->>API: ID reserva creado

        API->>DB: COMMIT
        DB-->>API: Transacción completada

        API->>Notif: Programa recordatorio<br/>24h antes
        Notif->>DB: INSERT INTO notificaciones<br/>(socio_id, tipo='recordatorio_reserva')
        DB-->>Notif: Notificación creada

        API->>Socio: Envía email<br/>de confirmación
        API-->>Frontend: Reserva creada
        Frontend-->>Socio: Muestra comprobante
    end

    Note over Socio, DB: 24 horas antes de la reserva

    Notif->>DB: SELECT reservas<br/>WHERE fecha_inicio BETWEEN<br/>NOW() + INTERVAL '24 hours'<br/>AND NOW() + INTERVAL '25 hours'
    DB-->>Notif: Reservas próximas
    Notif->>Socio: Envía recordatorio<br/>(email/push)
```

### Trigger de Base de Datos Aplicado

El trigger `trg_validar_superposicion_reserva` se ejecuta automáticamente:

```sql
-- Se activa antes de INSERT o UPDATE en reservas
CREATE TRIGGER trg_validar_superposicion_reserva
    BEFORE INSERT OR UPDATE ON reservas
    FOR EACH ROW EXECUTE FUNCTION validar_superposicion_reserva();
```

### Reglas de Negocio Aplicadas

- **RN-01:** Validación de superposición de horarios (trigger DB)
- **RN-02:** Máximo 3 reservas por socio por semana
- **RN-03:** Socio con 3+ inasistencias en 90 días está bloqueado
- **RN-04:** Recordatorio automático 24 horas antes
- **RN-05:** Reserva en estado "pendiente" hasta confirmación

---

## 4. Flujo de Creación de Setlist para Evento

```mermaid
sequenceDiagram
    autonumber
    actor LiderBanda as Líder de Banda
    participant Frontend as Frontend<br/>(React)
    participant API as API Gateway<br/>(Node.js)
    participant Eventos as Servicio<br/>Eventos
    participant Setlists as Servicio<br/>Setlists
    participant DB as PostgreSQL<br/>Database
    participant Validador as Validador<br/>Instrumentos

    LiderBanda->>Frontend: Accede a evento<br/>asignado
    Frontend->>API: GET /api/eventos/:id/detalles
    API->>Eventos: Consulta evento
    Eventos->>DB: SELECT FROM eventos<br/>JOIN bandas WHERE banda_id = ?
    DB-->>Eventos: Datos del evento
    Eventos-->>API: JSON evento
    API-->>Frontend: Renderiza detalles
    Frontend-->>LiderBanda: Muestra info del evento

    LiderBanda->>Frontend: Inicia creación<br/>de setlist
    Frontend->>API: GET /api/canciones?genero=&dificultad=
    API->>DB: SELECT FROM canciones<br/>ORDER BY titulo
    DB-->>API: Catálogo de canciones
    API-->>Frontend: Lista de canciones
    Frontend-->>LiderBanda: Muestra repertorio

    LiderBanda->>Frontend: Agrega canciones<br/>al setlist
    Frontend->>API: POST /api/setlists/agregar
    API->>Setlists: Valida y ordena<br/>canciones

    loop Por cada canción agregada
        API->>Validador: Verifica instrumentos<br/>requeridos
        Validador->>DB: SELECT FROM<br/>instrumento_requerido<br/>WHERE cancion_id = ?
        DB-->>Validador: Instrumentos necesarios
        Validador->>DB: SELECT FROM instrumentos<br/>WHERE tipo = ? AND estado = 'excelente'
        DB-->>Validador: Instrumentos disponibles
    end

    alt Faltan instrumentos
        Validador-->>API: Warning: Instrumentos<br/>no disponibles
        API-->>Frontend: Alerta de instrumentos
        Frontend-->>LiderBanda: Notifica faltantes
    else Todo disponible
        Validador-->>API: OK - Instrumentos OK

        API->>DB: BEGIN TRANSACTION

        loop Por cada canción en setlist
            API->>DB: INSERT INTO setlists<br/>(evento_id, banda_id,<br/>cancion_id, orden, notas)
            DB-->>API: Fila creada
        end

        API->>DB: COMMIT
        DB-->>API: Setlist guardado

        API->>Frontend: Setlist creado<br/>exitosamente
        Frontend-->>LiderBanda: Confirma setlist
    end

    Note over LiderBanda, DB: Día del evento

    LiderBanda->>Frontend: Consulta setlist<br/>del día
    Frontend->>API: GET /api/eventos/:id/setlist
    API->>DB: SELECT FROM vista_setlist_evento<br/>WHERE evento_id = ?
    DB-->>API: Setlist completo
    API-->>Frontend: JSON setlist
    Frontend-->>LiderBanda: Muestra setlist<br/>con acordes y notas
```

---

## Leyenda de Símbolos

| Símbolo | Significado |
|---------|-------------|
| actor | Usuario externo al sistema |
| participant | Componente del sistema |
| solid arrow | Solicitud/llamada |
| dashed arrow | Respuesta |
| Note | Nota explicativa |
| alt/else | Condición condicional |
| loop | Iteración repetitiva |
| DB cylinder | Base de datos PostgreSQL |

---

*Documento de diagramas de secuencia para el Sistema del Club de Música*
