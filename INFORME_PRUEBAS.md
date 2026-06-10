# Informe de Pruebas — Sistema Club de Música PUCESA
**Fecha:** 10 de junio de 2026  
**Versión:** 1.0  
**Rama:** `feat/prestamos-inventario-v2`  
**URL del sistema:** http://localhost:8088

---

## 1. Descripción General del Sistema

El Sistema de Gestión del Club de Música PUCESA es una aplicación web que permite administrar socios, instrumentos, salas de ensayo, reservas y préstamos. Cuenta con dos roles: **ADMIN** y **SOCIO**, cada uno con permisos diferenciados.

### Arquitectura
| Componente | Tecnología | Puerto |
|---|---|---|
| Frontend | React 18 + React Big Calendar | 3001 |
| Backend API | Python Flask 3 + JWT | 5000 |
| Base de datos | MariaDB 10.11 | 3306 |
| Proxy | Nginx | **8088** (acceso principal) |

### Usuarios de prueba (seed)
| Nombre | Email | Contraseña | Rol |
|---|---|---|---|
| Juan Sandoval | juan.sandoval@pucesa.edu.ec | Musica2026! | **ADMIN** |
| Braulio Silva | braulio.silva@pucesa.edu.ec | Musica2026! | SOCIO |
| Javier Herrada | javier.herrada@pucesa.edu.ec | Musica2026! | SOCIO |
| Ana Pérez | ana.perez@pucesa.edu.ec | Musica2026! | SOCIO |

### Horario operativo del sistema
Las operaciones de **reservas**, **préstamos** y **devoluciones** solo están habilitadas:
- **Lunes a viernes:** todo el día
- **Sábado:** hasta las 12:00
- **Domingo:** bloqueado completamente

---

## 2. Criterios de Aceptación del Sistema

Listado general de funcionalidades que el sistema debe cumplir. Cada criterio fue verificado durante las pruebas.

### 2.1 Autenticación y Sesión
- [x] El sistema permite iniciar sesión con email y contraseña institucional
- [x] El sistema rechaza credenciales incorrectas con mensaje de error claro
- [x] El sistema bloquea el acceso a cuentas con estado BLOQUEADO
- [x] El token JWT expira en 24 horas
- [x] El cierre de sesión invalida el token en el servidor (blacklist)
- [x] El sistema redirige automáticamente al login si el token expiró o es inválido

### 2.2 Dashboard
- [x] El administrador ve 5 tarjetas: Socios activos, Instrumentos, Salas disponibles, Reservas confirmadas, Préstamos activos
- [x] El socio ve 2 tarjetas: Sus reservas confirmadas, Sus préstamos activos
- [x] Al hacer clic en cualquier tarjeta se abre un modal con resumen detallado de esa categoría
- [x] Los modales muestran datos reales de la base de datos, no ficticios
- [x] Los modales se cierran con ESC o haciendo clic en el fondo

### 2.3 Gestión de Socios (solo ADMIN)
- [x] El admin puede ver la lista completa de socios con búsqueda en tiempo real
- [x] El admin puede crear nuevos socios con contraseña por defecto (Musica2026!)
- [x] El admin puede editar nombre, teléfono, nivel y rol de un socio
- [x] El admin puede bloquear/desbloquear socios
- [x] El sistema impide eliminar al último administrador activo
- [x] El admin puede ver el historial completo de reservas y préstamos de cada socio

### 2.4 Inventario de Instrumentos (solo ADMIN)
- [x] El admin ve todos los instrumentos con su estado actual (DISPONIBLE, PRESTADO, MANTENIMIENTO, BAJA)
- [x] El admin puede registrar nuevos instrumentos con tipo, marca, modelo y número de serie
- [x] El admin puede editar los datos de un instrumento
- [x] El admin puede cambiar el estado de un instrumento
- [x] El sistema impide dar en préstamo un instrumento que no está en estado DISPONIBLE
- [x] Al iniciar la API, se auto-corrigen instrumentos marcados PRESTADO sin préstamo activo real

### 2.5 Salas de Ensayo (solo ADMIN)
- [x] El admin ve la lista de salas con nombre, tipo, capacidad y estado
- [x] El admin puede crear nuevas salas
- [x] El admin puede editar datos de una sala
- [x] El admin puede activar/desactivar salas
- [x] Solo salas en estado ACTIVA aparecen disponibles para reservas

### 2.6 Reservas de Salas
- [x] El sistema detecta conflictos de horario en tiempo real al seleccionar sala y hora (antes de enviar el formulario)
- [x] El botón "Confirmar reserva" permanece deshabilitado si hay conflicto de horario detectado
- [x] Al seleccionar una sala, el calendario filtra y muestra solo las reservas de esa sala
- [x] El calendario muestra TODAS las reservas de la sala seleccionada (propias en verde, de otros en azul), sin ocultar disponibilidad real
- [x] El admin puede reservar en nombre de cualquier socio
- [x] El socio solo puede crear reservas para sí mismo
- [x] El sistema bloquea reservas en domingo o sábado después de las 12:00
- [x] El sistema rechaza fechas de inicio en el pasado
- [x] El sistema rechaza reservas que no comiencen y terminen el mismo día
- [x] El sistema rechaza reservas de más de 4 horas de duración
- [x] Las reservas pueden cancelarse desde la lista o el calendario
- [x] El calendario permite seleccionar un rango de tiempo para pre-llenar el formulario

### 2.7 Préstamos de Instrumentos
- [x] El admin puede registrar préstamos a cualquier socio
- [x] El socio puede solicitar un préstamo para sí mismo
- [x] El sistema impide que un socio tenga más de un préstamo activo al mismo tiempo
- [x] El sistema impide prestar un instrumento que no esté DISPONIBLE
- [x] El sistema impide préstamos en domingo o sábado después de las 12:00
- [x] La fecha límite de devolución debe ser posterior a la fecha de salida
- [x] El sistema marca automáticamente como VENCIDO los préstamos que superan su fecha límite (proceso automático nocturno)
- [x] El admin puede registrar la devolución de préstamos en estado ACTIVO y también VENCIDO
- [x] Al devolver, el instrumento recupera el estado DISPONIBLE (o el que el admin indique)

### 2.8 Multas
- [x] El admin puede registrar multas asociadas a un socio, con motivo y monto
- [x] El admin puede marcar multas como PAGADAS
- [x] El socio puede ver sus propias multas
- [x] El admin ve todas las multas de todos los socios

### 2.9 Perfil de Usuario
- [x] Cualquier usuario puede actualizar su nombre y teléfono desde su perfil
- [x] Cualquier usuario puede cambiar su propia contraseña
- [x] El sistema valida que la contraseña actual sea correcta antes de permitir el cambio
- [x] La nueva contraseña se almacena cifrada (bcrypt o PBKDF2-SHA256)

### 2.10 Seguridad y Roles
- [x] Los endpoints de administración están protegidos y rechazan solicitudes de socios
- [x] El token JWT se valida en cada solicitud al servidor
- [x] Los socios no pueden ver datos de otros socios (reservas, préstamos, multas filtrados por su ID)
- [x] El sistema usa HTTPS-ready (nginx como proxy inverso)

---

## 3. Casos de Prueba Detallados

### MÓDULO 1 — Autenticación

#### TC-001: Inicio de sesión como Administrador
| Campo | Detalle |
|---|---|
| **ID** | TC-001 |
| **Módulo** | Autenticación |
| **Precondición** | Sistema corriendo en http://localhost:8088 |
| **Pasos** | 1. Abrir http://localhost:8088 · 2. Ingresar email: `juan.sandoval@pucesa.edu.ec` · 3. Ingresar contraseña: `Musica2026!` · 4. Clic en "Iniciar sesión" |
| **Resultado esperado** | Redirige al dashboard mostrando las 5 tarjetas de estadísticas; menú lateral con todas las secciones |
| **Estado** | ✅ PASA |

#### TC-002: Inicio de sesión como Socio
| Campo | Detalle |
|---|---|
| **ID** | TC-002 |
| **Módulo** | Autenticación |
| **Precondición** | Sistema corriendo |
| **Pasos** | 1. Ingresar email: `ana.perez@pucesa.edu.ec` · 2. Contraseña: `Musica2026!` · 3. Clic en "Iniciar sesión" |
| **Resultado esperado** | Redirige al dashboard con 2 tarjetas (sus reservas y préstamos); menú lateral sin secciones de administración |
| **Estado** | ✅ PASA |

#### TC-003: Credenciales incorrectas
| Campo | Detalle |
|---|---|
| **ID** | TC-003 |
| **Módulo** | Autenticación |
| **Pasos** | 1. Ingresar email válido · 2. Contraseña incorrecta: `ClaveErrada123` · 3. Clic en "Iniciar sesión" |
| **Resultado esperado** | Mensaje de error "Credenciales inválidas". No hay acceso al sistema |
| **Estado** | ✅ PASA |

#### TC-004: Cierre de sesión
| Campo | Detalle |
|---|---|
| **ID** | TC-004 |
| **Módulo** | Autenticación |
| **Precondición** | Usuario con sesión activa |
| **Pasos** | 1. Clic en botón "Salir" (esquina superior derecha) |
| **Resultado esperado** | Token invalidado en servidor. Redirige a la pantalla de login. No se puede volver atrás con el botón del navegador |
| **Estado** | ✅ PASA |

---

### MÓDULO 2 — Dashboard

#### TC-005: Modales de tarjetas en Dashboard (Admin)
| Campo | Detalle |
|---|---|
| **ID** | TC-005 |
| **Módulo** | Dashboard |
| **Precondición** | Sesión activa como ADMIN |
| **Pasos** | 1. Desde el dashboard, hacer clic en la tarjeta "Socios activos" · 2. Cerrar con ESC · 3. Repetir con cada tarjeta (Instrumentos, Salas, Reservas, Préstamos) |
| **Resultado esperado** | Cada tarjeta abre un modal con degradado de color distinto, chips de resumen y lista de registros reales. Se cierra con ESC o clic en fondo |
| **Estado** | ✅ PASA |

#### TC-006: Dashboard limitado para Socio
| Campo | Detalle |
|---|---|
| **ID** | TC-006 |
| **Módulo** | Dashboard |
| **Precondición** | Sesión activa como SOCIO |
| **Pasos** | 1. Observar el dashboard al iniciar sesión |
| **Resultado esperado** | Solo muestra 2 tarjetas: "Tus reservas confirmadas" y "Tus préstamos activos". No se ven datos de otros socios |
| **Estado** | ✅ PASA |

---

### MÓDULO 3 — Gestión de Socios

#### TC-007: Crear nuevo socio
| Campo | Detalle |
|---|---|
| **ID** | TC-007 |
| **Módulo** | Socios |
| **Precondición** | Sesión como ADMIN → sección "Socios" |
| **Pasos** | 1. Clic en "+ Nuevo socio" · 2. Completar nombre, email institucional (@pucesa.edu.ec), teléfono, nivel · 3. Clic en "Crear socio" |
| **Resultado esperado** | Socio creado con contraseña por defecto `Musica2026!`. Aparece en la lista. El nuevo socio puede iniciar sesión inmediatamente |
| **Estado** | ✅ PASA |

#### TC-008: Bloquear un socio
| Campo | Detalle |
|---|---|
| **ID** | TC-008 |
| **Módulo** | Socios |
| **Precondición** | Sesión como ADMIN → sección "Socios" |
| **Pasos** | 1. Localizar un socio en la lista · 2. Cambiar su estado a BLOQUEADO · 3. Intentar iniciar sesión con ese socio |
| **Resultado esperado** | El socio bloqueado recibe "Credenciales inválidas" al intentar entrar. No puede acceder |
| **Estado** | ✅ PASA |

#### TC-009: Protección del último administrador
| Campo | Detalle |
|---|---|
| **ID** | TC-009 |
| **Módulo** | Socios |
| **Precondición** | Solo queda un ADMIN activo en el sistema |
| **Pasos** | 1. Intentar cambiar el rol del único admin a SOCIO, o intentar bloquearlo |
| **Resultado esperado** | El sistema rechaza la acción con mensaje de error: no se puede quedar el sistema sin administrador activo |
| **Estado** | ✅ PASA |

---

### MÓDULO 4 — Inventario de Instrumentos

#### TC-010: Registrar nuevo instrumento
| Campo | Detalle |
|---|---|
| **ID** | TC-010 |
| **Módulo** | Inventario |
| **Precondición** | Sesión como ADMIN → sección "Inventario" |
| **Pasos** | 1. Clic en "+ Nuevo instrumento" · 2. Seleccionar tipo, ingresar nombre, marca, modelo, número de serie único, fecha de adquisición · 3. Guardar |
| **Resultado esperado** | Instrumento creado en estado DISPONIBLE. Aparece en la lista y queda disponible para préstamos |
| **Estado** | ✅ PASA |

#### TC-011: Instrumento no disponible bloquea préstamo
| Campo | Detalle |
|---|---|
| **ID** | TC-011 |
| **Módulo** | Inventario / Préstamos |
| **Pasos** | 1. Cambiar un instrumento a estado MANTENIMIENTO · 2. Ir a Préstamos e intentar seleccionar ese instrumento |
| **Resultado esperado** | El instrumento no aparece en la lista de disponibles. No se puede seleccionar para un nuevo préstamo |
| **Estado** | ✅ PASA |

---

### MÓDULO 5 — Salas de Ensayo

#### TC-012: Sala inactiva no aparece en reservas
| Campo | Detalle |
|---|---|
| **ID** | TC-012 |
| **Módulo** | Salas / Reservas |
| **Precondición** | Sesión como ADMIN |
| **Pasos** | 1. En "Salas", cambiar el estado de una sala a INACTIVA · 2. Ir a "Reservas" · 3. Abrir el selector de sala |
| **Resultado esperado** | La sala inactivada no aparece en el dropdown de reservas. Solo se listan salas en estado ACTIVA |
| **Estado** | ✅ PASA |

---

### MÓDULO 6 — Reservas de Salas

#### TC-013: Crear reserva exitosa
| Campo | Detalle |
|---|---|
| **ID** | TC-013 |
| **Módulo** | Reservas |
| **Precondición** | Sesión activa (admin o socio) · Horario operativo (lunes–sábado hasta 12:00) |
| **Pasos** | 1. Ir a "Reservas" · 2. Seleccionar sala disponible · 3. Ingresar fecha futura (lunes a sábado) · 4. Hora inicio: 09:00 · 5. Hora fin: 10:00 · 6. Aceptar términos · 7. Clic "Confirmar reserva" |
| **Resultado esperado** | Reserva creada con estado CONFIRMADA. Aparece en la lista y en el calendario |
| **Estado** | ✅ PASA |

#### TC-014: Detección de conflicto en tiempo real
| Campo | Detalle |
|---|---|
| **ID** | TC-014 |
| **Módulo** | Reservas |
| **Precondición** | Existe al menos una reserva confirmada para la sala seleccionada |
| **Pasos** | 1. Seleccionar la misma sala · 2. Ingresar un horario que se solape con la reserva existente |
| **Resultado esperado** | Aparece inmediatamente el aviso rojo "La sala ya está reservada en ese horario" sin necesidad de enviar el formulario. El botón "Confirmar reserva" queda deshabilitado |
| **Estado** | ✅ PASA |

#### TC-015: Calendario filtra por sala seleccionada
| Campo | Detalle |
|---|---|
| **ID** | TC-015 |
| **Módulo** | Reservas |
| **Pasos** | 1. En el formulario, seleccionar una sala específica · 2. Observar el calendario |
| **Resultado esperado** | El calendario se actualiza mostrando solo las reservas de esa sala. Aparece un chip con el nombre de la sala en el encabezado del calendario |
| **Estado** | ✅ PASA |

#### TC-016: Calendario muestra disponibilidad real para socio
| Campo | Detalle |
|---|---|
| **ID** | TC-016 |
| **Módulo** | Reservas |
| **Precondición** | Sesión como SOCIO |
| **Pasos** | 1. Seleccionar una sala en el formulario · 2. Observar el calendario |
| **Resultado esperado** | Se muestran TODAS las reservas de esa sala. Las propias en verde, las de otros socios en azul (sin mostrar el nombre, solo "Ocupado"). No se oculta ninguna reserva para mostrar disponibilidad real |
| **Estado** | ✅ PASA |

#### TC-017: Bloqueo por horario no operativo
| Campo | Detalle |
|---|---|
| **ID** | TC-017 |
| **Módulo** | Reservas |
| **Precondición** | Acceder al sistema en domingo o sábado después de las 12:00 |
| **Pasos** | 1. Ir a "Reservas" · 2. Intentar completar el formulario |
| **Resultado esperado** | Aparece el aviso "Fuera de horario operativo". El formulario está deshabilitado. No se puede crear ninguna reserva |
| **Estado** | ✅ PASA |

#### TC-018: Reserva no puede superar 4 horas
| Campo | Detalle |
|---|---|
| **ID** | TC-018 |
| **Módulo** | Reservas |
| **Pasos** | 1. Ingresar hora inicio: 08:00 · 2. Ingresar hora fin: 13:00 (5 horas) |
| **Resultado esperado** | Aparece el error "La reserva no puede durar más de 4 horas" de forma inmediata. Botón deshabilitado |
| **Estado** | ✅ PASA |

#### TC-019: Reserva solo en el mismo día
| Campo | Detalle |
|---|---|
| **ID** | TC-019 |
| **Módulo** | Reservas |
| **Pasos** | 1. Ingresar fecha inicio: lunes 09:00 · 2. Ingresar fecha fin: martes 10:00 |
| **Resultado esperado** | Error "La reserva debe iniciar y terminar el mismo día". Botón deshabilitado |
| **Estado** | ✅ PASA |

---

### MÓDULO 7 — Préstamos de Instrumentos

#### TC-020: Registrar préstamo exitoso
| Campo | Detalle |
|---|---|
| **ID** | TC-020 |
| **Módulo** | Préstamos |
| **Precondición** | Sesión como ADMIN · Instrumento en estado DISPONIBLE · Socio sin préstamo activo |
| **Pasos** | 1. Ir a "Préstamos" · 2. Seleccionar socio · 3. Seleccionar instrumento · 4. Fecha de salida: mañana 09:00 · 5. Fecha límite: en 14 días · 6. Ingresar motivo · 7. Clic "Solicitar préstamo" |
| **Resultado esperado** | Préstamo creado en estado ACTIVO. El instrumento cambia a estado PRESTADO. El socio ya no puede solicitar otro préstamo |
| **Estado** | ✅ PASA |

#### TC-021: Bloqueo de segundo préstamo activo
| Campo | Detalle |
|---|---|
| **ID** | TC-021 |
| **Módulo** | Préstamos |
| **Precondición** | Socio con un préstamo activo |
| **Pasos** | 1. Seleccionar ese mismo socio en el formulario de préstamo · 2. Observar el formulario |
| **Resultado esperado** | Aparece un aviso indicando que el socio ya tiene un préstamo activo. El botón "Solicitar préstamo" está deshabilitado |
| **Estado** | ✅ PASA |

#### TC-022: Devolver préstamo activo
| Campo | Detalle |
|---|---|
| **ID** | TC-022 |
| **Módulo** | Préstamos |
| **Precondición** | Sesión como ADMIN · Préstamo en estado ACTIVO |
| **Pasos** | 1. Localizar el préstamo en la lista · 2. Clic en "Devolver" |
| **Resultado esperado** | Préstamo cambia a estado DEVUELTO. El instrumento vuelve a estado DISPONIBLE. El socio puede solicitar un nuevo préstamo |
| **Estado** | ✅ PASA |

#### TC-023: Devolver préstamo vencido
| Campo | Detalle |
|---|---|
| **ID** | TC-023 |
| **Módulo** | Préstamos |
| **Precondición** | Préstamo marcado como VENCIDO (superó su fecha límite) |
| **Pasos** | 1. Localizar el préstamo VENCIDO (aparece con indicador ⚠) · 2. Clic en "Devolver ⚠" |
| **Resultado esperado** | El préstamo vencido también puede ser devuelto. Cambia a DEVUELTO e instrumento a DISPONIBLE |
| **Estado** | ✅ PASA |

#### TC-024: Proceso automático de vencimiento
| Campo | Detalle |
|---|---|
| **ID** | TC-024 |
| **Módulo** | Préstamos |
| **Precondición** | Préstamo con fecha límite vencida |
| **Pasos** | 1. Esperar o crear un préstamo con fecha límite en el pasado · 2. El cron se ejecuta cada hora |
| **Resultado esperado** | El sistema automáticamente cambia el estado del préstamo de ACTIVO a VENCIDO sin intervención manual |
| **Estado** | ✅ PASA |

---

### MÓDULO 8 — Multas

#### TC-025: Registrar y pagar multa
| Campo | Detalle |
|---|---|
| **ID** | TC-025 |
| **Módulo** | Multas |
| **Precondición** | Sesión como ADMIN |
| **Pasos** | 1. Registrar una multa para un socio con motivo y monto · 2. Marcarla como PAGADA |
| **Resultado esperado** | Multa creada en estado PENDIENTE. Al marcarla, cambia a PAGADA con fecha de pago registrada. El socio puede ver su multa desde su perfil |
| **Estado** | ✅ PASA |

---

### MÓDULO 9 — Perfil de Usuario

#### TC-026: Actualizar datos personales
| Campo | Detalle |
|---|---|
| **ID** | TC-026 |
| **Módulo** | Perfil |
| **Precondición** | Cualquier usuario con sesión activa |
| **Pasos** | 1. Ir a "Perfil" · 2. Cambiar nombre y teléfono · 3. Clic "Guardar cambios" |
| **Resultado esperado** | Datos actualizados correctamente. El nombre nuevo aparece en el topbar |
| **Estado** | ✅ PASA |

#### TC-027: Cambio de contraseña
| Campo | Detalle |
|---|---|
| **ID** | TC-027 |
| **Módulo** | Perfil |
| **Pasos** | 1. Ir a "Perfil" → sección cambiar contraseña · 2. Ingresar contraseña actual correcta · 3. Nueva contraseña + confirmación coincidentes · 4. Guardar |
| **Resultado esperado** | Contraseña actualizada. El sistema obliga a usar la nueva contraseña en el siguiente inicio de sesión |
| **Estado** | ✅ PASA |

#### TC-028: Cambio de contraseña con clave actual incorrecta
| Campo | Detalle |
|---|---|
| **ID** | TC-028 |
| **Módulo** | Perfil |
| **Pasos** | 1. Ir a "Perfil" → cambiar contraseña · 2. Ingresar contraseña actual INCORRECTA · 3. Intentar guardar |
| **Resultado esperado** | Error "Contraseña actual incorrecta". La contraseña NO cambia |
| **Estado** | ✅ PASA |

---

### MÓDULO 10 — Seguridad de la API

#### TC-029: Acceso sin token rechazado
| Campo | Detalle |
|---|---|
| **ID** | TC-029 |
| **Módulo** | Seguridad |
| **Pasos** | 1. Hacer una petición directa a `GET http://localhost:5000/api/users` sin encabezado Authorization |
| **Resultado esperado** | HTTP 401 — "Token no proporcionado" |
| **Estado** | ✅ PASA |

#### TC-030: Endpoint de admin bloqueado para socio
| Campo | Detalle |
|---|---|
| **ID** | TC-030 |
| **Módulo** | Seguridad |
| **Pasos** | 1. Iniciar sesión como SOCIO y obtener su token · 2. Hacer `POST http://localhost:5000/api/users` con ese token |
| **Resultado esperado** | HTTP 403 — "Se requieren permisos de administrador" |
| **Estado** | ✅ PASA |

---

## 4. Resumen de Resultados

| Módulo | Casos probados | Pasaron | Fallaron |
|---|---|---|---|
| Autenticación | 4 | 4 | 0 |
| Dashboard | 2 | 2 | 0 |
| Socios | 3 | 3 | 0 |
| Inventario | 2 | 2 | 0 |
| Salas | 1 | 1 | 0 |
| Reservas | 7 | 7 | 0 |
| Préstamos | 5 | 5 | 0 |
| Multas | 1 | 1 | 0 |
| Perfil | 3 | 3 | 0 |
| Seguridad API | 2 | 2 | 0 |
| **TOTAL** | **30** | **30** | **0** |

---

## 5. Observaciones Técnicas

- **Zona horaria:** El servidor Docker corre en UTC. El sistema usa un helper interno `_now_local()` que convierte a UTC-5 (Ecuador) para todas las validaciones de horario y fechas.
- **Contraseña por defecto:** Todos los usuarios nuevos se crean con `Musica2026!`. Se recomienda cambiarla en el primer inicio de sesión.
- **Proceso automático (cron):** APScheduler ejecuta en segundo plano la revisión de préstamos vencidos cada hora. No requiere intervención manual.
- **Auto-corrección al inicio:** Cada vez que la API arranca, verifica y corrige automáticamente instrumentos en estado PRESTADO que no tengan un préstamo activo asociado.
- **WhatsApp Bridge:** El servicio de notificaciones WhatsApp aparece en estado "Restarting" — no afecta ninguna funcionalidad core del sistema; es un servicio adicional de notificaciones.

---

*Documento generado el 10 de junio de 2026 — Sistema Club de Música PUCESA v1.0*
