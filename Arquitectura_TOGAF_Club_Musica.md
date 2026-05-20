# Arquitectura Empresarial - Plataforma Club de Música (Framework TOGAF)

**Autores:** Juan Sandoval, Braulio Silva, Javier Herrada (Adaptación a TOGAF)
**Versión:** 2.0 (Basado en el Documento Original Grupo 2)
**Fecha:** Mayo 2026

---

## Introducción y Fase Preliminar

El marco de trabajo TOGAF (The Open Group Architecture Framework) se utiliza para asegurar que los objetivos de negocio del Club de Música estén respaldados y habilitados de forma trazable por la arquitectura de TI y datos.

### 1.1 Principios de Arquitectura
Para guiar el desarrollo de la Plataforma del Club de Música, se establecen los siguientes principios arquitectónicos:
1. **Alineación con el Negocio:** Toda decisión tecnológica debe facilitar la gestión y logística del club (préstamos, reservas, eventos).
2. **Gestión de Datos Centralizada y Segura:** Los datos de socios e inventarios son activos valiosos; deben protegerse y mantenerse consistentes.
3. **Interoperabilidad:** Uso de APIs RESTful para garantizar la integración fluida entre clientes web, móviles y sistemas de mensajería (WhatsApp Bridge).
4. **Arquitectura Escalable y Basada en Contenedores:** Uso de Docker y orquestación para facilitar actualizaciones, recuperación y escalabilidad.
5. **Independencia Tecnológica:** Separación estricta entre la lógica de presentación (React) y los servicios de backend, permitiendo evolución independiente.

---

## Fase A: Visión de la Arquitectura

### 2.1 Objetivos de Negocio
Proveer un sistema digital unificado y de alta disponibilidad que automatice y centralice el préstamo de instrumentos, la reserva equitativa de salas de ensayo y la logística completa para la organización de eventos y conciertos del club.

### 2.2 Resumen de Requerimientos (Visión de Alto Nivel)
- **Funcionales:** Registro y perfil de socios, gestión de préstamos, control de reservas de salas sin superposición, control de asistencia/penalizaciones, y logística de eventos (bandas, setlists, instrumentos requeridos).
- **No Funcionales:** Tiempos de respuesta óptimos (< 2 seg), alta disponibilidad, respaldos automatizados, responsividad en dispositivos móviles.
- **Seguridad:** Cifrado en tránsito (HTTPS), autenticación basada en JWT, protección XSS/SQL Injection, auditoría de eventos y segmentación de red.

---

## Fase B: Arquitectura de Negocio

La arquitectura de negocio define la estrategia de operaciones del club y las capacidades necesarias para ejecutarla.

### 3.1 Mapa de Capacidades de Negocio
- **Gestión de Membresía:** Registro, validación de estado de cuenta y control de historial de préstamos/faltas.
- **Logística de Activos Físicos:** Administración del inventario de instrumentos y mantenimiento preventivo.
- **Operaciones Diarias:** Ciclo de préstamo-devolución y reservas de cubículos o salones acústicos.
- **Producción Musical:** Coordinación de eventos, repertorios musicales (setlists) y acopio de grabaciones y partituras.

### 3.2 Flujos de Valor y Procesos Clave (Modelados en BPMN)
1. **Préstamo de Instrumentos:** Solicitud → Verificación de estado del socio (deudas/sanciones) → Validación de disponibilidad e integridad física del equipo → Registro de préstamo → Devolución.
2. **Reserva de Salas de Ensayo:** Selección de fecha/hora → Comprobación automática de superposiciones o límites de inasistencia → Confirmación → Notificación (Email/WhatsApp) → Recordatorio a las 24 horas.
3. **Gestión de Eventos:** Planificación → Asignación de bandas y setlists → Validación cruzada de instrumentos requeridos vs inventario disponible → Generación de hoja de ruta y soundcheck → Ejecución del evento.

---

## Fase C: Arquitectura de Sistemas de Información

Esta fase se desglosa en la Arquitectura de Datos y la Arquitectura de Aplicaciones.

### 4.1 Arquitectura de Datos

#### Modelo Lógico y Gestión
- **Dominios de Datos Clave:** Socios, Instrumentos, Préstamos, Salas, Reservas, Eventos, Bandas, Canciones y Setlists.
- **Almacenamiento Estructurado:** Base de datos relacional (PostgreSQL 16 o MariaDB) que soporta el Modelo Entidad-Relación y garantiza integridad referencial (ej. validación única de correos, transaccionalidad en reservas).
- **Almacenamiento No Estructurado:** Sistema de archivos (NAS con RAID 5 / MinIO S3) para gestionar documentos pesados como partituras y audios de presentaciones.
- **Datos Temporales y Rendimiento:** Uso de Redis como caché para acelerar la comprobación de disponibilidad de inventario y reservas en tiempo real.

### 4.2 Arquitectura de Aplicaciones

El sistema aplica un patrón de arquitectura en capas y basada en servicios:
- **Capa de Presentación (Frontend):** Interfaz SPA responsiva en React 18, apoyada por TypeScript y TailwindCSS.
- **Capa de Aplicación (Backend):** APIs de micro/macro servicios desarrollados en Node.js (Express/NestJS) o Python (Flask).
- **Capa de Integración y Microservicios:** Módulo especializado `whatsapp-bridge` para envío de notificaciones automáticas y alertas en tiempo real al dispositivo móvil del socio.

---

## Fase D: Arquitectura Tecnológica

La infraestructura subyacente que soporta la arquitectura de datos y aplicaciones.

### 5.1 Entorno de Ejecución (Software)
- **Orquestación y Despliegue:** Docker y Docker Compose para empaquetado y estandarización del entorno.
- **Balanceo y Proxies:** Nginx actuando como Reverse Proxy, Firewall a nivel de aplicación (WAF) y terminación SSL.

### 5.2 Diseño de Red e Infraestructura Física
- **Topología de Red (VLANs Segmentadas):**
  - *DMZ:* Zona Desmilitarizada para Nginx y el Firewall de borde.
  - *VLAN 10 (Administración):* Para Servidores y acceso de administradores de TI.
  - *VLAN 20 (Socios WiFi):* Segmento aislado para dispositivos de usuarios, provisto por Access Points Ubiquiti/Aruba.
  - *VLAN 30 (Equipos):* Conexión para el NAS, Servidor de Backups e impresoras.
  - *VLAN 40 (Invitados):* Acceso controlado para eventos públicos.
- **Hardware de Servidores:**
  - Servidor Principal: Procesador Intel Xeon/AMD Ryzen PRO, 32GB RAM ECC, 2x1TB NVMe SSD (RAID 1), bajo Ubuntu Server 24.04 LTS.
  - NAS: Intel Core i5, 16GB RAM, 12TB almacenamiento útil (RAID 5) sobre TrueNAS.

---

## Fase E: Oportunidades y Soluciones (Gap Analysis)

Identificación de brechas entre el estado actual y el estado objetivo arquitectónico:

| Brecha Identificada | Solución Propuesta (Paquete de Trabajo) |
|---------------------|-----------------------------------------|
| Retrasos en devoluciones e inasistencias a salas. | Implementación del módulo de Notificaciones automatizadas (Email y WhatsApp Bridge) con reglas de bloqueo automático en base de datos. |
| Inconsistencia en partituras y material de las bandas. | Despliegue de un Servidor NAS Centralizado y módulos en la aplicación para subir/vincular material al evento. |
| Riesgos de seguridad por exposición de la base de datos a redes públicas. | Segmentación física y lógica de la red con un Firewall estricto, VLANs y Nginx Reverse Proxy centralizado. |

---

## Fase F: Planificación de la Migración

Estrategia iterativa de desarrollo e implementación consolidada en 5 fases progresivas (Tiempo estimado: ~4.5 meses):

1. **Fase 1 - Core de Miembros e Instrumentos (Sprints 1-3):** 
   - Diseño de la BD, infraestructura base, CRUD de socios e instrumentos y ciclo de préstamos básico.
2. **Fase 2 - Gestión de Instalaciones (Sprints 4-6):** 
   - Sistema de Reservas de salas, algoritmos de validación de horarios y notificaciones.
3. **Fase 3 - Producción Musical (Sprints 7-9):** 
   - Módulo de eventos, conformación de bandas, repertorios y asignación de setlists.
4. **Fase 4 - Almacenamiento de Medios (Sprints 10-11):** 
   - Montaje del servidor NAS y funcionalidades para carga de partituras/grabaciones desde la UI.
5. **Fase 5 - Transición y Go-Live (Sprints 12-14):** 
   - Pruebas unitarias e integrales, documentación final, capacitación de directivos/socios y puesta en producción.

---

*Documento refactorizado aplicando el Framework TOGAF (ADM) a partir del análisis original del proyecto "Plataforma Club de Música".*
