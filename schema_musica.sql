-- ============================================================================
-- SCHEMA_MUSICA.SQL - Sistema de Gestión Club de Música (MariaDB)
-- ============================================================================
-- Autores: Juan Sandoval, Braulio Silva, Javier Herrada
-- Database: MariaDB
-- ============================================================================

-- ============================================================================
-- TABLAS PRINCIPALES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Tabla: Users (Sustituye a Socios)
-- ----------------------------------------------------------------------------
CREATE TABLE Users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre_completo VARCHAR(150) NOT NULL,
    email_institucional VARCHAR(100) UNIQUE NOT NULL,
    telefono_whatsapp VARCHAR(20) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    password_salt VARCHAR(255) NOT NULL,
    instrumento_principal VARCHAR(50),
    nivel_habilidad ENUM('principiante', 'intermedio', 'avanzado', 'profesional') DEFAULT 'principiante',
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    estado ENUM('activo', 'bloqueado', 'suspendido', 'egresado') DEFAULT 'activo'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Tabla: Inventario (Sustituye a Instrumentos)
-- ----------------------------------------------------------------------------
CREATE TABLE Inventario (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    tipo VARCHAR(50) NOT NULL,
    marca VARCHAR(50),
    modelo VARCHAR(50),
    estado ENUM('excelente', 'bueno', 'regular', 'dañado', 'en_mantenimiento', 'baja') DEFAULT 'excelente',
    stock INT DEFAULT 1,
    ubicacion VARCHAR(100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Tabla: Reservas (Para Salas de Ensayo)
-- ----------------------------------------------------------------------------
CREATE TABLE Reservas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    fecha_inicio DATETIME NOT NULL,
    fecha_fin DATETIME NOT NULL,
    estado ENUM('confirmada', 'cancelada', 'completada', 'inasistencia', 'pendiente') DEFAULT 'pendiente',
    fecha_notificacion_enviada BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Tabla: Prestamos (Relaciona Users con Inventario)
-- ----------------------------------------------------------------------------
CREATE TABLE Prestamos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    inventario_id INT NOT NULL,
    fecha_salida DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_devolucion DATETIME NULL,
    fecha_limite DATETIME NOT NULL,
    estado ENUM('activo', 'devuelto', 'vencido', 'reportado_dañado') DEFAULT 'activo',
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE RESTRICT,
    FOREIGN KEY (inventario_id) REFERENCES Inventario(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Tabla: Logs_Auditoria (QA / Seguridad)
-- ----------------------------------------------------------------------------
CREATE TABLE Logs_Auditoria (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    accion VARCHAR(255) NOT NULL,
    detalles TEXT,
    fecha_accion DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Datos de prueba
INSERT INTO Users (nombre_completo, email_institucional, telefono_whatsapp, password_hash, password_salt, instrumento_principal, nivel_habilidad) VALUES
    ('Juan Sandoval', 'juan.sandoval@pucesa.edu.ec', '+56912345678', 'hash_ejemplo_1', 'salt_ejemplo_1', 'Guitarra', 'avanzado'),
    ('Braulio Silva', 'braulio.silva@pucesa.edu.ec', '+56912345679', 'hash_ejemplo_2', 'salt_ejemplo_2', 'Bajo', 'intermedio'),
    ('Javier Herrada', 'javier.herrada@pucesa.edu.ec', '+56912345680', 'hash_ejemplo_3', 'salt_ejemplo_3', 'Batería', 'avanzado');

INSERT INTO Inventario (nombre, tipo, marca, modelo, estado, stock, ubicacion) VALUES
    ('Fender Stratocaster', 'Guitarra Eléctrica', 'Fender', 'Stratocaster', 'excelente', 1, 'Sala 1'),
    ('Yamaha Drum Kit', 'Batería', 'Yamaha', 'Rydeen', 'bueno', 1, 'Estudio');
