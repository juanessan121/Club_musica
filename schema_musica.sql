-- ============================================================================
-- SCHEMA_MUSICA.SQL - Sistema de Gestión Club de Música (MariaDB)
-- ============================================================================
-- Modelo normalizado 3FN/BCNF con auditoría por triggers.
-- Contraseña inicial de socios semilla: Musica2026!
-- La API guarda bcrypt en SOCIO.password_hash al primer login si está vacío.
-- ============================================================================

CREATE DATABASE IF NOT EXISTS club_musica
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE club_musica;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TRIGGER IF EXISTS trg_auditoria_reserva_update;
DROP TRIGGER IF EXISTS trg_auditoria_prestamo_update;
DROP TRIGGER IF EXISTS trg_auditoria_instrumento_update;

DROP TABLE IF EXISTS Logs_Auditoria;
DROP TABLE IF EXISTS Prestamos;
DROP TABLE IF EXISTS Reservas;
DROP TABLE IF EXISTS Salas;
DROP TABLE IF EXISTS Inventario;
DROP TABLE IF EXISTS Users;

DROP TABLE IF EXISTS AUDITORIA_INSTRUMENTO;
DROP TABLE IF EXISTS AUDITORIA_PRESTAMO;
DROP TABLE IF EXISTS AUDITORIA_RESERVA;
DROP TABLE IF EXISTS RESERVA;
DROP TABLE IF EXISTS PRESTAMO;
DROP TABLE IF EXISTS SETLIST;
DROP TABLE IF EXISTS PARTICIPACION_EVENTO;
DROP TABLE IF EXISTS BANDA_SOCIO;
DROP TABLE IF EXISTS INSTRUMENTO_REQUERIDO;
DROP TABLE IF EXISTS INSTRUMENTO;
DROP TABLE IF EXISTS BANDA;
DROP TABLE IF EXISTS EVENTO;
DROP TABLE IF EXISTS CANCION;
DROP TABLE IF EXISTS SALA;
DROP TABLE IF EXISTS SOCIO;
DROP TABLE IF EXISTS TIPO_INSTRUMENTO;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- 1. CATÁLOGOS BASE (ENTIDADES FUERTES)
-- ============================================================================

CREATE TABLE TIPO_INSTRUMENTO (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE SOCIO (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    telefono VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL DEFAULT '',
    password_salt VARCHAR(255) NOT NULL DEFAULT '',
    nivel_habilidad VARCHAR(30) NOT NULL CHECK (nivel_habilidad IN ('PRINCIPIANTE', 'INTERMEDIO', 'AVANZADO', 'PROFESIONAL')),
    rol VARCHAR(20) NOT NULL DEFAULT 'SOCIO' CHECK (rol IN ('ADMIN', 'SOCIO')),
    fecha_registro DATE NOT NULL DEFAULT (CURRENT_DATE),
    estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO', 'BLOQUEADO', 'INACTIVO')),
    INDEX idx_socio_estado (estado),
    INDEX idx_socio_rol (rol)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE SALA (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('CUBICULO', 'SALON_ACUSTICO', 'ESTUDIO')),
    capacidad INT NOT NULL CHECK (capacidad > 0),
    equipamiento TEXT,
    estado VARCHAR(30) NOT NULL DEFAULT 'ACTIVA' CHECK (estado IN ('ACTIVA', 'MANTENIMIENTO', 'INACTIVA')),
    INDEX idx_sala_estado (estado),
    INDEX idx_sala_tipo (tipo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE CANCION (
    id INT PRIMARY KEY AUTO_INCREMENT,
    titulo VARCHAR(150) NOT NULL,
    artista VARCHAR(100) NOT NULL,
    genero VARCHAR(50),
    duracion_segundos INT NOT NULL CHECK (duracion_segundos > 0),
    tonalidad VARCHAR(15),
    partitura_url VARCHAR(2083),
    grabacion_url VARCHAR(2083),
    INDEX idx_cancion_artista (artista),
    INDEX idx_cancion_genero (genero)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE EVENTO (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(150) NOT NULL,
    fecha DATETIME NOT NULL,
    lugar VARCHAR(150) NOT NULL,
    descripcion TEXT,
    estado VARCHAR(30) NOT NULL DEFAULT 'PLANIFICADO' CHECK (estado IN ('PLANIFICADO', 'EN_PROGRESO', 'FINALIZADO', 'CANCELADO')),
    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_evento_fecha_estado (fecha, estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE BANDA (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    genero VARCHAR(50),
    fecha_formacion DATE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 2. INVENTARIO Y ASIGNACIONES MULTIVARIADAS (3FN / BCNF)
-- ============================================================================

CREATE TABLE INSTRUMENTO (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL,
    tipo_instrumento_id INT NOT NULL,
    marca VARCHAR(50),
    modelo VARCHAR(50),
    numero_serie VARCHAR(100) NOT NULL UNIQUE,
    fecha_adquisicion DATE,
    estado VARCHAR(30) NOT NULL DEFAULT 'DISPONIBLE' CHECK (estado IN ('DISPONIBLE', 'PRESTADO', 'MANTENIMIENTO', 'BAJA')),
    ubicacion VARCHAR(100),
    modificado_por VARCHAR(50) NOT NULL DEFAULT 'SYSTEM',
    ultima_actualizacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tipo_instrumento_id) REFERENCES TIPO_INSTRUMENTO(id) ON DELETE RESTRICT,
    INDEX idx_instrumento_tipo (tipo_instrumento_id),
    INDEX idx_instrumento_estado (estado),
    INDEX idx_instrumento_ubicacion (ubicacion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE INSTRUMENTO_REQUERIDO (
    id INT PRIMARY KEY AUTO_INCREMENT,
    cancion_id INT NOT NULL,
    tipo_instrumento_id INT NOT NULL,
    especificaciones TEXT,
    FOREIGN KEY (cancion_id) REFERENCES CANCION(id) ON DELETE CASCADE,
    FOREIGN KEY (tipo_instrumento_id) REFERENCES TIPO_INSTRUMENTO(id) ON DELETE RESTRICT,
    CONSTRAINT UC_Cancion_TipoInstrumento UNIQUE (cancion_id, tipo_instrumento_id),
    INDEX idx_instr_req_tipo (tipo_instrumento_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE BANDA_SOCIO (
    banda_id INT NOT NULL,
    socio_id INT NOT NULL,
    rol VARCHAR(50) NOT NULL DEFAULT 'INTEGRANTE' CHECK (rol IN ('INTEGRANTE', 'LIDER', 'FUNDADOR')),
    PRIMARY KEY (banda_id, socio_id),
    FOREIGN KEY (banda_id) REFERENCES BANDA(id) ON DELETE CASCADE,
    FOREIGN KEY (socio_id) REFERENCES SOCIO(id) ON DELETE RESTRICT,
    INDEX idx_banda_socio_socio (socio_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE PARTICIPACION_EVENTO (
    id INT PRIMARY KEY AUTO_INCREMENT,
    evento_id INT NOT NULL,
    banda_id INT NOT NULL,
    estado_confirmacion VARCHAR(30) NOT NULL DEFAULT 'CONFIRMADO' CHECK (estado_confirmacion IN ('PENDIENTE', 'CONFIRMADO', 'CANCELADO')),
    FOREIGN KEY (evento_id) REFERENCES EVENTO(id) ON DELETE CASCADE,
    FOREIGN KEY (banda_id) REFERENCES BANDA(id) ON DELETE RESTRICT,
    CONSTRAINT UC_Evento_Banda UNIQUE (evento_id, banda_id),
    INDEX idx_participacion_banda (banda_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE SETLIST (
    id INT PRIMARY KEY AUTO_INCREMENT,
    participacion_id INT NOT NULL,
    cancion_id INT NOT NULL,
    orden INT NOT NULL CHECK (orden > 0),
    notas TEXT,
    FOREIGN KEY (participacion_id) REFERENCES PARTICIPACION_EVENTO(id) ON DELETE CASCADE,
    FOREIGN KEY (cancion_id) REFERENCES CANCION(id) ON DELETE RESTRICT,
    CONSTRAINT UC_Participacion_Orden UNIQUE (participacion_id, orden),
    CONSTRAINT UC_Participacion_Cancion UNIQUE (participacion_id, cancion_id),
    INDEX idx_setlist_cancion (cancion_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 3. TRANSACCIONALES CON BORRADO LÓGICO Y RASTREO
-- ============================================================================

CREATE TABLE PRESTAMO (
    id INT PRIMARY KEY AUTO_INCREMENT,
    socio_id INT NOT NULL,
    instrumento_id INT NOT NULL,
    fecha_salida DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_limite DATETIME NOT NULL,
    fecha_devolucion DATETIME,
    estado VARCHAR(30) NOT NULL DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO', 'DEVUELTO', 'VENCIDO')),
    motivo VARCHAR(200) NULL,
    observaciones TEXT,
    eliminado_en DATETIME NULL,
    creado_por VARCHAR(50) NOT NULL DEFAULT 'SYSTEM',
    modificado_por VARCHAR(50) NOT NULL DEFAULT 'SYSTEM',
    FOREIGN KEY (socio_id) REFERENCES SOCIO(id) ON DELETE RESTRICT,
    FOREIGN KEY (instrumento_id) REFERENCES INSTRUMENTO(id) ON DELETE RESTRICT,
    CONSTRAINT CK_Fechas_Prestamo CHECK (fecha_limite >= fecha_salida),
    INDEX idx_prestamo_socio (socio_id),
    INDEX idx_prestamo_instrumento_estado (instrumento_id, estado),
    INDEX idx_prestamo_estado_limite (estado, fecha_limite),
    INDEX idx_prestamo_eliminado (eliminado_en)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE RESERVA (
    id INT PRIMARY KEY AUTO_INCREMENT,
    socio_id INT NOT NULL,
    sala_id INT NOT NULL,
    fecha_inicio DATETIME NOT NULL,
    fecha_fin DATETIME NOT NULL,
    estado VARCHAR(30) NOT NULL DEFAULT 'CONFIRMADA' CHECK (estado IN ('CONFIRMADA', 'CANCELADA', 'COMPLETADA', 'INASISTENCIA', 'REPROGRAMADA')),
    observaciones TEXT,
    reserva_anterior_id INT NULL,
    eliminado_en DATETIME NULL,
    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_por VARCHAR(50) NOT NULL DEFAULT 'SYSTEM',
    modificado_por VARCHAR(50) NOT NULL DEFAULT 'SYSTEM',
    FOREIGN KEY (socio_id) REFERENCES SOCIO(id) ON DELETE RESTRICT,
    FOREIGN KEY (sala_id) REFERENCES SALA(id) ON DELETE RESTRICT,
    FOREIGN KEY (reserva_anterior_id) REFERENCES RESERVA(id) ON DELETE RESTRICT,
    CONSTRAINT CK_Fechas_Reserva CHECK (fecha_fin > fecha_inicio),
    INDEX idx_reserva_socio (socio_id),
    INDEX idx_reserva_sala_fecha (sala_id, fecha_inicio, fecha_fin),
    INDEX idx_reserva_estado_fecha (estado, fecha_inicio),
    INDEX idx_reserva_eliminado (eliminado_en)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 4. TABLAS DE AUDITORÍA
-- ============================================================================

CREATE TABLE AUDITORIA_RESERVA (
    id INT PRIMARY KEY AUTO_INCREMENT,
    reserva_id INT NOT NULL,
    estado_antiguo VARCHAR(30),
    estado_nuevo VARCHAR(30),
    fecha_inicio_antigua DATETIME,
    fecha_inicio_nueva DATETIME,
    fecha_cambio DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuario_responsable VARCHAR(50) NOT NULL,
    accion VARCHAR(20) NOT NULL,
    INDEX idx_aud_reserva (reserva_id),
    INDEX idx_aud_reserva_fecha (fecha_cambio)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE AUDITORIA_PRESTAMO (
    id INT PRIMARY KEY AUTO_INCREMENT,
    prestamo_id INT NOT NULL,
    estado_antiguo VARCHAR(30),
    estado_nuevo VARCHAR(30),
    fecha_cambio DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuario_responsable VARCHAR(50) NOT NULL,
    accion VARCHAR(20) NOT NULL,
    INDEX idx_aud_prestamo (prestamo_id),
    INDEX idx_aud_prestamo_fecha (fecha_cambio)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE AUDITORIA_INSTRUMENTO (
    id INT PRIMARY KEY AUTO_INCREMENT,
    instrumento_id INT NOT NULL,
    estado_antiguo VARCHAR(30),
    estado_nuevo VARCHAR(30),
    fecha_cambio DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuario_responsable VARCHAR(50) NOT NULL,
    INDEX idx_aud_instrumento (instrumento_id),
    INDEX idx_aud_instrumento_fecha (fecha_cambio)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DELIMITER //

-- -----------------------------------------------------------------------------
-- TRIGGER 1: Rastrear cambios y borrados lógicos en RESERVAS
-- -----------------------------------------------------------------------------
CREATE TRIGGER trg_auditoria_reserva_update
AFTER UPDATE ON RESERVA
FOR EACH ROW
BEGIN
    DECLARE tipo_accion VARCHAR(20);

    IF (NEW.eliminado_en IS NOT NULL AND OLD.eliminado_en IS NULL) THEN
        SET tipo_accion = 'SOFT_DELETE';
    ELSE
        SET tipo_accion = 'UPDATE';
    END IF;

    IF (OLD.estado != NEW.estado) OR (OLD.fecha_inicio != NEW.fecha_inicio) OR (tipo_accion = 'SOFT_DELETE') THEN
        INSERT INTO AUDITORIA_RESERVA (
            reserva_id, estado_antiguo, estado_nuevo,
            fecha_inicio_antigua, fecha_inicio_nueva,
            usuario_responsable, accion
        )
        VALUES (
            NEW.id, OLD.estado, NEW.estado,
            OLD.fecha_inicio, NEW.fecha_inicio,
            NEW.modificado_por, tipo_accion
        );
    END IF;
END; //

-- -----------------------------------------------------------------------------
-- TRIGGER 2: Rastrear cambios de estado en PRÉSTAMOS
-- -----------------------------------------------------------------------------
CREATE TRIGGER trg_auditoria_prestamo_update
AFTER UPDATE ON PRESTAMO
FOR EACH ROW
BEGIN
    DECLARE tipo_accion VARCHAR(20);

    IF (NEW.eliminado_en IS NOT NULL AND OLD.eliminado_en IS NULL) THEN
        SET tipo_accion = 'SOFT_DELETE';
    ELSE
        SET tipo_accion = 'UPDATE';
    END IF;

    IF (OLD.estado != NEW.estado) OR (tipo_accion = 'SOFT_DELETE') THEN
        INSERT INTO AUDITORIA_PRESTAMO (
            prestamo_id, estado_antiguo, estado_nuevo,
            usuario_responsable, accion
        )
        VALUES (
            NEW.id, OLD.estado, NEW.estado,
            NEW.modificado_por, tipo_accion
        );
    END IF;
END; //

-- -----------------------------------------------------------------------------
-- TRIGGER 3: Rastrear el desgaste físico y estado de INSTRUMENTOS
-- -----------------------------------------------------------------------------
CREATE TRIGGER trg_auditoria_instrumento_update
AFTER UPDATE ON INSTRUMENTO
FOR EACH ROW
BEGIN
    IF OLD.estado != NEW.estado THEN
        INSERT INTO AUDITORIA_INSTRUMENTO (
            instrumento_id, estado_antiguo, estado_nuevo, usuario_responsable
        )
        VALUES (
            NEW.id, OLD.estado, NEW.estado, NEW.modificado_por
        );
    END IF;
END; //

DELIMITER ;

-- ============================================================================
-- 5. DATOS SEMILLA
-- ============================================================================

INSERT INTO TIPO_INSTRUMENTO (nombre, descripcion) VALUES
    ('Guitarra Eléctrica', 'Guitarras amplificadas para ensayo y escenario'),
    ('Batería', 'Kits acústicos o electrónicos'),
    ('Amplificador', 'Amplificación para bajo, guitarra o voz'),
    ('Teclado', 'Pianos y sintetizadores'),
    ('Micrófono', 'Micrófonos dinámicos y de condensador'),
    ('Bajo', 'Bajos eléctricos y acústicos'),
    ('Guitarra Acústica', 'Guitarras acústicas y electroacústicas'),
    ('Percusión Menor', 'Cajones, congas, bongos y percusión menor'),
    ('Instrumento de Viento', 'Saxofones, flautas, trompetas y similares'),
    ('Efectos y Procesadores', 'Pedaleras, procesadores y multi-efectos'),
    ('Sistema de Audio', 'Interfaces, consolas y sistemas PA');

INSERT INTO SOCIO (nombre, email, telefono, password_hash, password_salt, nivel_habilidad, rol, estado) VALUES
    ('Juan Sandoval', 'juan.sandoval@pucesa.edu.ec', '+593991234567', '', '', 'AVANZADO', 'ADMIN', 'ACTIVO'),
    ('Braulio Silva', 'braulio.silva@pucesa.edu.ec', '+593992345678', '', '', 'INTERMEDIO', 'SOCIO', 'ACTIVO'),
    ('Javier Herrada', 'javier.herrada@pucesa.edu.ec', '+593993456789', '', '', 'AVANZADO', 'SOCIO', 'ACTIVO'),
    ('Ana Pérez', 'ana.perez@pucesa.edu.ec', '+593994567890', '', '', 'PRINCIPIANTE', 'SOCIO', 'ACTIVO');

INSERT INTO SALA (nombre, tipo, capacidad, equipamiento, estado) VALUES
    ('Sala de Ensayo Principal', 'SALON_ACUSTICO', 10, 'Batería acústica, amplificadores, micrófonos, atriles', 'ACTIVA'),
    ('Estudio de Grabación', 'ESTUDIO', 4, 'Interfaz de audio, monitores, micrófonos de condensador', 'ACTIVA'),
    ('Sala Acústica', 'SALON_ACUSTICO', 6, 'Piano digital, sillas, atriles', 'ACTIVA'),
    ('Cabina Individual', 'CUBICULO', 2, 'Amplificador compacto y metrónomo', 'MANTENIMIENTO');

INSERT INTO CANCION (titulo, artista, genero, duracion_segundos, tonalidad) VALUES
    ('Sweet Child O Mine', 'Guns N Roses', 'Rock', 356, 'D'),
    ('Stand By Me', 'Ben E. King', 'Soul', 180, 'A'),
    ('Lamento Boliviano', 'Enanitos Verdes', 'Rock Latino', 226, 'Em');

INSERT INTO EVENTO (nombre, fecha, lugar, descripcion, estado) VALUES
    ('Festival Cultural PUCE Ambato', '2026-06-12 18:00:00', 'Auditorio Principal', 'Presentación de bandas universitarias', 'PLANIFICADO');

INSERT INTO BANDA (nombre, genero, fecha_formacion) VALUES
    ('Ensamble Central', 'Rock Latino', '2026-01-15');

INSERT INTO INSTRUMENTO (
    nombre, tipo_instrumento_id, marca, modelo, numero_serie,
    fecha_adquisicion, estado, ubicacion
) VALUES
    -- Guitarras Eléctricas (tipo 1)
    ('Fender Stratocaster', 1, 'Fender', 'Player Stratocaster', 'FN-123456', '2025-02-10', 'DISPONIBLE', 'Bodega principal'),
    ('Gibson Les Paul Standard', 1, 'Gibson', 'Les Paul Standard', 'GB-111111', '2024-09-15', 'DISPONIBLE', 'Bodega principal'),
    ('Ibanez RG550', 1, 'Ibanez', 'RG550', 'IB-222222', '2025-01-20', 'DISPONIBLE', 'Bodega principal'),
    ('ESP LTD EC-1000', 1, 'ESP', 'EC-1000', 'ES-333333', '2024-07-05', 'DISPONIBLE', 'Bodega secundaria'),
    ('Squier Classic Vibe 50s', 1, 'Squier', 'Classic Vibe 50s', 'SQ-444444', '2025-03-12', 'DISPONIBLE', 'Bodega secundaria'),
    -- Baterías (tipo 2)
    ('Yamaha Rydeen Kit', 2, 'Yamaha', 'Rydeen', 'YM-789012', '2024-11-15', 'DISPONIBLE', 'Sala de Ensayo Principal'),
    ('Pearl Export Kit', 2, 'Pearl', 'Export EXX', 'PE-555555', '2025-05-08', 'DISPONIBLE', 'Sala de Ensayo Principal'),
    ('Tama Imperialstar', 2, 'Tama', 'Imperialstar', 'TM-666666', '2024-12-20', 'DISPONIBLE', 'Sala Acústica'),
    -- Amplificadores (tipo 3)
    ('Ampeg Rocket Bass', 3, 'Ampeg', 'RB-110', 'AM-224466', '2025-04-20', 'DISPONIBLE', 'Bodega principal'),
    ('Marshall DSL40CR', 3, 'Marshall', 'DSL40CR', 'MR-777777', '2025-01-10', 'DISPONIBLE', 'Sala de Ensayo Principal'),
    ('Fender Blues Junior IV', 3, 'Fender', 'Blues Junior IV', 'FD-888888', '2024-10-30', 'DISPONIBLE', 'Bodega principal'),
    ('Blackstar HT5R MkII', 3, 'Blackstar', 'HT5R MkII', 'BL-999999', '2025-02-28', 'DISPONIBLE', 'Bodega secundaria'),
    ('Boss Katana 50 MkII', 3, 'Boss', 'Katana-50 MkII', 'BS-101010', '2025-06-01', 'DISPONIBLE', 'Sala de Ensayo Principal'),
    -- Teclados (tipo 4)
    ('Korg B2', 4, 'Korg', 'B2', 'KG-334455', '2024-08-08', 'MANTENIMIENTO', 'Estudio de Grabación'),
    ('Roland FP-30X', 4, 'Roland', 'FP-30X', 'RL-202020', '2025-03-15', 'DISPONIBLE', 'Estudio de Grabación'),
    ('Yamaha P-145', 4, 'Yamaha', 'P-145', 'YM-303030', '2024-11-25', 'DISPONIBLE', 'Sala Acústica'),
    ('Casio CT-X700', 4, 'Casio', 'CT-X700', 'CS-404040', '2025-04-05', 'DISPONIBLE', 'Bodega principal'),
    ('Nord Stage 3', 4, 'Nord', 'Stage 3 Compact', 'ND-505050', '2024-06-18', 'DISPONIBLE', 'Estudio de Grabación'),
    -- Micrófonos (tipo 5)
    ('Shure SM58', 5, 'Shure', 'SM58', 'SH-556677', '2025-09-01', 'DISPONIBLE', 'Cabina de audio'),
    ('AKG C214', 5, 'AKG', 'C214', 'AK-505050', '2025-01-08', 'DISPONIBLE', 'Estudio de Grabación'),
    ('Audio-Technica AT2020', 5, 'Audio-Technica', 'AT2020', 'AT-606060', '2024-12-15', 'DISPONIBLE', 'Estudio de Grabación'),
    ('Sennheiser e835', 5, 'Sennheiser', 'e835', 'SE-707070', '2025-02-10', 'DISPONIBLE', 'Cabina de audio'),
    ('Shure SM7B', 5, 'Shure', 'SM7B', 'SH-808080', '2024-09-22', 'DISPONIBLE', 'Estudio de Grabación'),
    ('Rode NT1', 5, 'Rode', 'NT1', 'RD-909090', '2025-05-15', 'DISPONIBLE', 'Estudio de Grabación'),
    -- Bajos (tipo 6)
    ('Fender Jazz Bass', 6, 'Fender', 'Player Jazz Bass', 'FJ-111213', '2025-03-28', 'DISPONIBLE', 'Bodega principal'),
    ('Gibson SG Bass', 6, 'Gibson', 'SG Standard Bass', 'GI-141516', '2024-10-05', 'DISPONIBLE', 'Bodega principal'),
    ('Music Man StingRay', 6, 'Music Man', 'StingRay 4', 'MM-171819', '2025-01-30', 'DISPONIBLE', 'Bodega principal'),
    -- Guitarras Acústicas (tipo 7)
    ('Yamaha FG800', 7, 'Yamaha', 'FG800', 'YA-202122', '2025-04-12', 'DISPONIBLE', 'Bodega principal'),
    ('Taylor Academy 12', 7, 'Taylor', 'Academy 12', 'TA-232425', '2024-08-20', 'DISPONIBLE', 'Sala Acústica'),
    ('Fender FA-135CE', 7, 'Fender', 'FA-135CE', 'FA-262728', '2025-02-14', 'DISPONIBLE', 'Bodega secundaria'),
    ('Takamine GN93CE', 7, 'Takamine', 'GN93CE', 'TK-293031', '2024-11-08', 'DISPONIBLE', 'Bodega principal'),
    -- Percusión Menor (tipo 8)
    ('Cajón Flamenco LP', 8, 'Latin Percussion', 'LP1180', 'LP-323334', '2025-03-05', 'DISPONIBLE', 'Sala de Ensayo Principal'),
    ('Set Congas Meinl 10/11', 8, 'Meinl', 'Headliner HC10BC-11BC', 'ME-353637', '2024-10-18', 'DISPONIBLE', 'Sala de Ensayo Principal'),
    ('Bongos Pearl', 8, 'Pearl', 'PB-512', 'PE-383940', '2025-01-22', 'DISPONIBLE', 'Bodega principal'),
    -- Instrumentos de Viento (tipo 9)
    ('Saxofón Alto Yamaha', 9, 'Yamaha', 'YAS-280', 'YS-414243', '2024-09-10', 'DISPONIBLE', 'Bodega principal'),
    ('Trompeta Bach TR300', 9, 'Bach', 'TR300H', 'BC-444546', '2025-04-22', 'DISPONIBLE', 'Bodega principal'),
    ('Flauta Traversa Gemeinhardt', 9, 'Gemeinhardt', '2SP', 'GE-474849', '2024-07-30', 'DISPONIBLE', 'Bodega secundaria'),
    -- Efectos y Procesadores (tipo 10)
    ('Boss GT-1000 Multi-FX', 10, 'Boss', 'GT-1000', 'BG-505152', '2025-02-05', 'DISPONIBLE', 'Bodega principal'),
    ('TC-Helicon VoiceLive Play', 10, 'TC-Helicon', 'VoiceLive Play', 'TC-535455', '2024-11-12', 'DISPONIBLE', 'Estudio de Grabación'),
    ('Line 6 HX Stomp', 10, 'Line 6', 'HX Stomp', 'L6-565758', '2025-03-20', 'DISPONIBLE', 'Bodega principal'),
    -- Sistemas de Audio (tipo 11)
    ('Interfaz Focusrite Scarlett 4i4', 11, 'Focusrite', 'Scarlett 4i4 3rd Gen', 'FC-596061', '2025-01-15', 'DISPONIBLE', 'Estudio de Grabación'),
    ('Mezcladora Behringer X32', 11, 'Behringer', 'X32 Compact', 'BH-626364', '2024-08-25', 'DISPONIBLE', 'Sala de Ensayo Principal'),
    ('Sistema PA QSC K12.2', 11, 'QSC', 'K12.2', 'QS-656667', '2025-05-10', 'DISPONIBLE', 'Bodega principal');

INSERT INTO INSTRUMENTO_REQUERIDO (cancion_id, tipo_instrumento_id, especificaciones) VALUES
    (1, 1, 'Guitarra líder con distorsión moderada'),
    (1, 2, 'Batería rock estándar'),
    (2, 6, 'Bajo con línea simple'),
    (3, 1, 'Guitarra rítmica acústica o limpia');

INSERT INTO BANDA_SOCIO (banda_id, socio_id, rol) VALUES
    (1, 1, 'LIDER'),
    (1, 2, 'INTEGRANTE'),
    (1, 3, 'INTEGRANTE');

INSERT INTO PARTICIPACION_EVENTO (evento_id, banda_id, estado_confirmacion) VALUES
    (1, 1, 'CONFIRMADO');

INSERT INTO SETLIST (participacion_id, cancion_id, orden, notas) VALUES
    (1, 3, 1, 'Abrir con tempo moderado'),
    (1, 2, 2, 'Versión corta'),
    (1, 1, 3, 'Cierre extendido');

INSERT INTO RESERVA (
    socio_id, sala_id, fecha_inicio, fecha_fin, estado, observaciones, creado_por, modificado_por
) VALUES
    (2, 1, DATE_ADD(CURDATE(), INTERVAL 2 DAY) + INTERVAL 15 HOUR, DATE_ADD(CURDATE(), INTERVAL 2 DAY) + INTERVAL 17 HOUR, 'CONFIRMADA', 'Ensayo de bajo y batería', 'SEED', 'SEED'),
    (3, 2, DATE_ADD(CURDATE(), INTERVAL 4 DAY) + INTERVAL 10 HOUR, DATE_ADD(CURDATE(), INTERVAL 4 DAY) + INTERVAL 12 HOUR, 'CONFIRMADA', 'Grabación demo', 'SEED', 'SEED'),
    (1, 3, DATE_ADD(CURDATE(), INTERVAL 6 DAY) + INTERVAL 14 HOUR, DATE_ADD(CURDATE(), INTERVAL 6 DAY) + INTERVAL 16 HOUR, 'CONFIRMADA', 'Ensayo general banda', 'SEED', 'SEED'),
    (4, 1, DATE_ADD(CURDATE(), INTERVAL 7 DAY) + INTERVAL 9 HOUR, DATE_ADD(CURDATE(), INTERVAL 7 DAY) + INTERVAL 10 HOUR + INTERVAL 30 MINUTE, 'CONFIRMADA', 'Clase práctica de piano', 'SEED', 'SEED');

-- Asegurar consistencia: instrumento prestado tiene estado PRESTADO
UPDATE INSTRUMENTO SET estado = 'PRESTADO' WHERE numero_serie = 'SQ-444444';

INSERT INTO PRESTAMO (
    socio_id, instrumento_id, fecha_salida, fecha_limite, estado,
    observaciones, creado_por, modificado_por
) VALUES
    (3, 5, NOW() - INTERVAL 2 DAY, NOW() + INTERVAL 14 DAY, 'ACTIVO', 'Festival Cultural PUCE Ambato | Garantía: Cédula de Identidad', 'SEED', 'SEED');
