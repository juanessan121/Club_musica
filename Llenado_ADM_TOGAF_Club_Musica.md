# FASES DEL ADM DE TOGAF
## Caso resuelto: Plataforma Club de Música

**Contenido:** Este documento incluye el formato de aplicación para cada una de las fases del ADM de TOGAF aplicadas a la transformación y optimización del Club de Música Universitario, basándose en la plantilla institucional establecida.

---

### 1. Preliminary Phase
**Propósito:** Preparar al Club de Música para desarrollar y estructurar la arquitectura empresarial, definiendo principios, alcance inicial, estructura de gobierno, repositorio y capacidad tecnológica.

**1. Definir los principios de arquitectura**
- Alineación con las necesidades operativas del club.
- Datos de inventario y socios como un activo único y confiable.
- Integración tecnológica mediante APIs antes que duplicación de esfuerzos.
- Seguridad por diseño (autenticación segura, control de permisos).
- Soluciones escalables para futuros eventos y miembros.

**2. Determinar el alcance inicial**
El alcance inicial incluye:
- Gestión de membresías y validación de usuarios.
- Módulo de préstamos de instrumentos y control de inventario.
- Módulo de reserva de salas (sin superposición de horarios).
- Logística de eventos musicales, setlists y roles.
Quedan fuera en esta etapa:
- Contrataciones externas y pago de membresías (si aplican).
- Infraestructura de salas físicas (insonorización, mantenimiento físico).

**3. Establecer la estructura de gobierno**
- **Comité Directivo (Coordinador del Club):** Valida prioridades de eventos e inventarios.
- **Architecture Board / Liderazgo Técnico:** Revisa la alineación tecnológica (PostgreSQL, Node/Python, Nginx).
- **Equipos de Implementación:** Desarrolladores a cargo de Frontend, Backend e Infraestructura (Docker).

**4. Crear la capacidad de arquitectura**
- Arquitecto empresarial / Líder técnico.
- Desarrolladores Full-stack (React, Node.js/Python).
- Analistas de requerimientos y QA.

**5. Definir el marco de trabajo a utilizar**
- **TOGAF** como marco principal.
- **ADM** como método de desarrollo.
- Catálogos de requerimientos, esquemas ERD y flujos BPMN como artefactos base.
- Sprints ágiles para las entregas (14 Sprints definidos).

**6. Habilitar el repositorio de arquitectura**
El repositorio contendrá:
- Código fuente (Frontend, Backend, WhatsApp Bridge).
- Documentos de arquitectura y diagramas Markdown.
- Esquemas de bases de datos (`schema_musica.sql`).
- Configuraciones de despliegue (`docker-compose.yml`).

**7. Identificar normas, políticas y restricciones**
- Reglamentos de la universidad sobre el uso de salas.
- Políticas de responsabilidad civil por préstamos (garantías y documentos).
- Restricciones de horario de ensayos (8:00 - 22:00).
- Seguridad de datos de los estudiantes (JWT, contraseñas cifradas con salt).

**8. Seleccionar herramientas y estándares**
- **Diagramación:** Mermaid para ERD y BPMN.
- **Tecnología:** Docker, PostgreSQL, Redis, NAS/MinIO, Nginx.
- **Desarrollo:** React (Frontend), API RESTful con Node.js/Python.

**9. Alinear la arquitectura con la estrategia institucional**
- Fomentar la participación estudiantil.
- Reducir la pérdida o daño de activos físicos (instrumentos).
- Optimizar la organización de presentaciones y logística.

**10. Definir el nivel de madurez inicial**
El club presenta una madurez inicial **baja** porque:
- Los registros se llevaban manualmente.
- No había control automatizado de sanciones por inasistencia o morosidad.

**11. Establecer el método de trabajo y control**
- Sprints de desarrollo de 2 a 3 semanas.
- Revisiones periódicas por el Comité de Arquitectura.

**12. Preparar la solicitud de trabajo de arquitectura**
- Objetivo: Digitalizar la gestión integral del club.
- Alcance: Socios, instrumentos, reservas, eventos.
- Entregables: Arquitectura de datos, API documentada, Web UI.

#### Formato de Fase Preliminar

| Campo | Contenido a completar |
|---|---|
| **Nombre del proyecto** | Transformación digital de la Plataforma Club de Música |
| **Organización** | Club de Música Universitario |
| **Patrocinador** | Coordinación del Club / Dirección de Asuntos Estudiantiles |
| **Equipo responsable** | Equipo de Arquitectura Empresarial (Juan Sandoval, Braulio Silva, Javier Herrada) |
| **Contexto actual** | Control manual de préstamos y reservas. Pérdida de inventario y superposición de ensayos por falta de seguimiento. |
| **Problema u oportunidad** | Falta de un sistema centralizado que regule el uso de activos y asistencia a salas. Oportunidad de modernizar con plataforma web e integración por WhatsApp. |
| **Objetivo** | Definir lineamientos y desarrollar una plataforma integral (ADM) para socios, instrumentos, reservas y eventos. |
| **Principios definidos** | 1) Datos únicos. 2) Interoperabilidad por APIs. 3) Seguridad y Auditoría. 4) Escalabilidad. |
| **Roles y responsabilidades** | Coordinador: patrocinio. Líder TI: validación técnica. Estudiantes: testing y uso. |
| **Gobierno** | Comité del Club de Música. |
| **Herramientas / repositorio** | Repositorio Git, Docker, Mermaid. |
| **Alcance preliminar** | Gestión de socios, préstamos, salas, reservas y eventos/setlists. |
| **Restricciones** | Tiempos de desarrollo limitados, presupuesto ajustado, continuidad operativa de las salas. |
| **Aprobaciones** | Aprobación inicial de la coordinación del club y validación funcional. |

---

### 2. Phase A: Architecture Vision
**Propósito:** Definir la visión de arquitectura, alcance, stakeholders y valor esperado para el Club.

**1. Definir la visión de arquitectura**
El Club de Música busca contar con una plataforma web unificada que centralice préstamos, ensayos y logística de eventos, brindando autoservicio a los miembros 24/7 y control total a la administración.

**2. Identificar interesados clave**
- Coordinadores del club.
- Socios (Estudiantes / Músicos).
- Equipo de soporte técnico e infraestructura.

**3. Levantar necesidades y preocupaciones**
- **Coordinadores:** Necesitan un historial confiable de préstamos para evitar robos y llevar un control estricto de inasistencias.
- **Socios:** Quieren ver disponibilidad de instrumentos y salas en tiempo real desde sus dispositivos móviles.
- **TI:** Requiere un despliegue sencillo y mantenible con backups automáticos.

**4. Objetivos de negocio**
- Reducir tiempos de solicitud y asignación de salas.
- Disminuir el daño/pérdida de instrumentos mediante validaciones y responsabilidades.
- Mejorar la organización técnica y logística de los conciertos.

**5. Delimitar alcance**
Sprints 1 a 14 cubriendo: Préstamos, Salas, Eventos y Servidor de Archivos (NAS) para partituras y grabaciones.

**6. Beneficios esperados**
- Eliminación de conflictos de horario en las salas de ensayo.
- Mayor responsabilidad de los usuarios mediante check-box de términos de uso.
- Acceso centralizado a setlists y partituras unificadas para todos los músicos de una banda.

#### Formato Fase A

| Campo | Contenido a completar |
|---|---|
| **Escenarios de negocio** | **Escenario 1:** Un socio revisa si un bajo está disponible y reserva un salón acústico para ensayar en un horario libre. <br>**Escenario 2:** La banda genera un setlist, solicita los requerimientos técnicos y sube las partituras al evento. |
| **Visión de solución** | Arquitectura en capas con Frontend SPA (React), Backend robusto (Express/Flask con PostgreSQL) y notificaciones multicanal (Email y WhatsApp Bridge). |

---

### 3. Fases Centrales (B, C, D)
*(Nota: El detalle técnico exhaustivo de estas fases se encuentra en los diagramas y diccionarios del proyecto).*

- **Phase B (Business Architecture):** Flujos y BPMN para procesos de préstamo, reservas con penalizaciones automáticas, y creación de eventos.
- **Phase C (Information Systems Architecture):** 
  - **Datos:** Modelo Entidad-Relación con tablas `Socio`, `Instrumento`, `Reserva`, `Prestamo`, `Setlist`. PostgreSQL para transacciones, NAS para archivos.
  - **Aplicaciones:** Interfaz React que consume una API RESTful estructurada en controladores y servicios.
- **Phase D (Technology Architecture):** Despliegue contenerizado (Docker), DMZ con Nginx, segmentación de red local con VLANs para administración, socios (WiFi) y equipos (Servidores).

---

### 4. Phase H: Architecture Change Management
**Propósito:** Gestionar las modificaciones y evoluciones a la arquitectura tecnológica inicial para adaptarse a nuevos requerimientos o problemas operativos.

#### Formato Fase H

| Campo | Contenido a completar |
|---|---|
| **Cambio detectado** | Integración de mensajería instantánea para recordatorios y alertas en tiempo real. |
| **Origen del cambio** | Evidencia de alta tasa de inasistencia a salas reservadas porque los socios no revisan el email institucional con frecuencia. |
| **Descripción del cambio** | Implementar un sistema automatizado de notificaciones vía WhatsApp conectado al módulo de reservas y vencimiento de préstamos. |
| **Impacto en aplicaciones** | Creación de un nuevo microservicio (`whatsapp-bridge`) conectado por red interna al backend principal. |
| **Impacto en tecnología** | Adición de contenedores para `whatsapp-bridge` y manejo de sesiones de autenticación de WhatsApp Web. |
| **Decisión tomada** | Incorporar el cambio en el despliegue del Docker Compose como un servicio independiente. |
| **Prioridad** | Alta. |
| **Responsable** | Líder Técnico / Equipo de Infraestructura. |

---

### 5. Requirements Management
**Propósito:** Gestionar, clasificar y dar trazabilidad a los requerimientos funcionales y no funcionales a lo largo de todas las fases del ADM.

**1. Clasificación de Requerimientos Clave:**
- **REQ-01 (Datos):** Registro único de socios mediante validación de correo electrónico.
- **REQ-02 (Negocio):** Aplicar penalización automática (bloqueo por 30 días) al sumar 3 inasistencias en reservas de sala.
- **REQ-03 (Tecnología):** Tiempo de respuesta menor a 2 segundos para las consultas de disponibilidad.
- **REQ-04 (Seguridad):** Mitigación de fuerza bruta en endpoints y protección JWT.

#### Formato de Requirements Management

| Campo | Contenido a completar |
|---|---|
| **Código del requerimiento** | REQ-002 |
| **Descripción del requerimiento** | El sistema debe bloquear automáticamente a un socio cuando registre 3 faltas en reservas de salas de ensayo. |
| **Tipo** | Negocio / Aplicaciones |
| **Origen / stakeholder** | Coordinación del Club |
| **Prioridad** | Alta |
| **Fase relacionada** | Fase B (Negocio) y Fase C (Aplicaciones) |
| **Estado** | Aprobado |
| **Criterio de aceptación** | Si un trabajo programado (cron) detecta la tercera inasistencia, el estado del socio en BD cambia a 'BLOQUEADO' y no puede crear nuevas reservas ni préstamos. |
| **Cambios realizados** | Modificación del esquema de base de datos para incluir contador de inasistencias. |
