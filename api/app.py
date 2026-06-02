import base64
import hashlib
import hmac
import os
from datetime import date, datetime, timedelta

import pymysql
import requests
from flask import Flask, jsonify, request
from flask_cors import CORS

try:
    import bcrypt
except ImportError:
    bcrypt = None


app = Flask(__name__)
CORS(app)

DB_HOST = os.environ.get("DB_HOST", "db-mariadb")
DB_USER = os.environ.get("DB_USER", "clubmusica")
DB_PASSWORD = os.environ.get("DB_PASSWORD", "clubmusica_secret_2026")
DB_NAME = os.environ.get("DB_NAME", "club_musica")
WHATSAPP_BRIDGE_URL = os.environ.get("WHATSAPP_BRIDGE_URL", "http://whatsapp-bridge:3002")
DEFAULT_PASSWORD = os.environ.get("DEFAULT_USER_PASSWORD", "Musica2026!")
SCHEMA_READY = False


def get_db_connection():
    return pymysql.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=False,
    )


def ok(data=None, status=200):
    return jsonify({} if data is None else data), status


def error(message, status=400):
    return jsonify({"error": message}), status


def parse_json():
    return request.get_json(silent=True) or {}


def require_fields(data, fields):
    missing = [field for field in fields if data.get(field) in (None, "")]
    if missing:
        return f"Campos requeridos: {', '.join(missing)}"
    return None


def serialize_row(row):
    if not row:
        return row
    serialized = {}
    for key, value in row.items():
        if isinstance(value, datetime):
            serialized[key] = value.strftime("%Y-%m-%d %H:%M:%S")
        elif isinstance(value, date):
            serialized[key] = value.isoformat()
        else:
            serialized[key] = value
    return serialized


def serialize_rows(rows):
    return [serialize_row(row) for row in rows]


def parse_datetime(value, field_name):
    if isinstance(value, datetime):
        return value
    for fmt in ("%Y-%m-%dT%H:%M", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M"):
        try:
            return datetime.strptime(str(value), fmt)
        except ValueError:
            continue
    raise ValueError(f"{field_name} debe tener formato datetime válido")


def parse_date(value, field_name):
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    if isinstance(value, datetime):
        return value.date()
    raw = str(value)
    if "T" in raw:
        raw = raw.split("T", 1)[0]
    if " " in raw:
        raw = raw.split(" ", 1)[0]
    try:
        return datetime.strptime(raw, "%Y-%m-%d").date()
    except ValueError as exc:
        raise ValueError(f"{field_name} debe tener formato YYYY-MM-DD") from exc


def hash_password(password):
    if bcrypt:
        return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 120000)
    return "pbkdf2_sha256$%s$%s" % (
        base64.b64encode(salt).decode("ascii"),
        base64.b64encode(digest).decode("ascii"),
    )


def verify_password(password, stored_hash):
    if not stored_hash:
        return False
    if stored_hash.startswith("$2") and bcrypt:
        return bcrypt.checkpw(password.encode("utf-8"), stored_hash.encode("utf-8"))
    if stored_hash.startswith("pbkdf2_sha256$"):
        _, salt_b64, digest_b64 = stored_hash.split("$", 2)
        salt = base64.b64decode(salt_b64)
        expected = base64.b64decode(digest_b64)
        actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 120000)
        return hmac.compare_digest(actual, expected)
    return False


def table_exists(cursor, table_name):
    cursor.execute("SHOW TABLES LIKE %s", (table_name,))
    return cursor.fetchone() is not None


def column_names(cursor, table_name):
    cursor.execute(f"SHOW COLUMNS FROM {table_name}")
    return {row["Field"] for row in cursor.fetchall()}


def trigger_exists(cursor, trigger_name):
    cursor.execute(
        """
        SELECT TRIGGER_NAME
        FROM information_schema.TRIGGERS
        WHERE TRIGGER_SCHEMA = DATABASE() AND TRIGGER_NAME = %s
        """,
        (trigger_name,),
    )
    return cursor.fetchone() is not None


def ensure_database_schema():
    """Small compatibility pass for databases created before auth columns existed."""
    global SCHEMA_READY
    if SCHEMA_READY:
        return

    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            if not table_exists(cursor, "SOCIO"):
                raise RuntimeError("La base de datos no está inicializada con schema_musica.sql")

            socio_cols = column_names(cursor, "SOCIO")
            if "password_hash" not in socio_cols:
                cursor.execute("ALTER TABLE SOCIO ADD COLUMN password_hash VARCHAR(255) NOT NULL DEFAULT '' AFTER telefono")
            if "password_salt" not in socio_cols:
                cursor.execute("ALTER TABLE SOCIO ADD COLUMN password_salt VARCHAR(255) NOT NULL DEFAULT '' AFTER password_hash")
            if "rol" not in socio_cols:
                cursor.execute("ALTER TABLE SOCIO ADD COLUMN rol VARCHAR(20) NOT NULL DEFAULT 'SOCIO' AFTER nivel_habilidad")
            cursor.execute("UPDATE SOCIO SET rol = 'ADMIN' WHERE email = 'juan.sandoval@pucesa.edu.ec'")
            cursor.execute("UPDATE SOCIO SET rol = 'SOCIO' WHERE rol IS NULL OR rol = ''")
            conn.commit()
            SCHEMA_READY = True
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


@app.before_request
def migrate_existing_database():
    if request.path == "/api/health":
        return None
    ensure_database_schema()
    return None


def normalize_level(value):
    allowed = {"PRINCIPIANTE", "INTERMEDIO", "AVANZADO", "PROFESIONAL"}
    normalized = str(value or "PRINCIPIANTE").upper()
    return normalized if normalized in allowed else "PRINCIPIANTE"


def normalize_role(value):
    return "ADMIN" if str(value or "").upper() == "ADMIN" else "SOCIO"


def normalize_socio_estado(value):
    allowed = {"ACTIVO", "BLOQUEADO", "INACTIVO"}
    normalized = str(value or "ACTIVO").upper()
    if normalized == "SUSPENDIDO":
        normalized = "INACTIVO"
    return normalized if normalized in allowed else "ACTIVO"


def normalize_sala_tipo(value):
    allowed = {"CUBICULO", "SALON_ACUSTICO", "ESTUDIO"}
    normalized = str(value or "CUBICULO").upper()
    return normalized if normalized in allowed else "CUBICULO"


def normalize_sala_estado(value):
    aliases = {"DISPONIBLE": "ACTIVA", "CLAUSURADA": "INACTIVA"}
    normalized = aliases.get(str(value or "ACTIVA").upper(), str(value or "ACTIVA").upper())
    return normalized if normalized in {"ACTIVA", "MANTENIMIENTO", "INACTIVA"} else "ACTIVA"


def normalize_instrumento_estado(value):
    aliases = {
        "EXCELENTE": "DISPONIBLE",
        "BUENO": "DISPONIBLE",
        "REGULAR": "DISPONIBLE",
        "DAÑADO": "MANTENIMIENTO",
        "DANADO": "MANTENIMIENTO",
        "EN_MANTENIMIENTO": "MANTENIMIENTO",
    }
    normalized = aliases.get(str(value or "DISPONIBLE").upper(), str(value or "DISPONIBLE").upper())
    return normalized if normalized in {"DISPONIBLE", "PRESTADO", "MANTENIMIENTO", "BAJA"} else "DISPONIBLE"


def normalize_reserva_estado(value):
    aliases = {"CONFIRMADA": "CONFIRMADA", "PENDIENTE": "CONFIRMADA"}
    normalized = aliases.get(str(value or "CONFIRMADA").upper(), str(value or "CONFIRMADA").upper())
    allowed = {"CONFIRMADA", "CANCELADA", "COMPLETADA", "INASISTENCIA", "REPROGRAMADA"}
    return normalized if normalized in allowed else "CONFIRMADA"


def normalize_prestamo_estado(value):
    normalized = str(value or "ACTIVO").upper()
    return normalized if normalized in {"ACTIVO", "DEVUELTO", "VENCIDO"} else "ACTIVO"


def socio_public(row):
    row = serialize_row(row)
    return {
        "id": row["id"],
        "nombre_completo": row["nombre"],
        "email_institucional": row["email"],
        "telefono_whatsapp": row.get("telefono"),
        "nivel_habilidad": row.get("nivel_habilidad"),
        "rol": row.get("rol", "SOCIO"),
        "estado": row.get("estado"),
        "fecha_registro": row.get("fecha_registro"),
    }


def get_or_create_tipo_instrumento(cursor, nombre):
    nombre = (nombre or "Otro").strip()
    cursor.execute("SELECT id FROM TIPO_INSTRUMENTO WHERE LOWER(nombre) = LOWER(%s)", (nombre,))
    found = cursor.fetchone()
    if found:
        return found["id"]
    cursor.execute("INSERT INTO TIPO_INSTRUMENTO (nombre) VALUES (%s)", (nombre,))
    return cursor.lastrowid


def notify_whatsapp(number, message):
    if not number:
        return False
    try:
        response = requests.post(
            f"{WHATSAPP_BRIDGE_URL}/send",
            json={"number": number, "message": message},
            timeout=3,
        )
        return response.status_code < 500
    except requests.RequestException:
        return False


def reservation_overlap(cursor, sala_id, fecha_inicio, fecha_fin, exclude_id=None):
    params = [sala_id, fecha_fin, fecha_inicio]
    sql = """
        SELECT id
        FROM RESERVA
        WHERE sala_id = %s
          AND eliminado_en IS NULL
          AND estado IN ('CONFIRMADA', 'REPROGRAMADA')
          AND fecha_inicio < %s
          AND fecha_fin > %s
    """
    if exclude_id:
        sql += " AND id <> %s"
        params.append(exclude_id)
    cursor.execute(sql, params)
    return cursor.fetchone() is not None


@app.route("/api/health", methods=["GET"])
def health():
    return ok({"status": "healthy", "service": "club-musica-api", "schema": "normalizado"})


@app.route("/api/auth/login", methods=["POST"])
@app.route("/api/login", methods=["POST"])
def login():
    data = parse_json()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or DEFAULT_PASSWORD
    if not email:
        return error("Correo requerido", 400)

    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM SOCIO WHERE email = %s", (email,))
            socio = cursor.fetchone()
            if not socio or socio["estado"] != "ACTIVO":
                return error("Credenciales inválidas", 401)

            valid = verify_password(password, socio.get("password_hash"))
            if not valid and socio.get("password_hash") in ("", None):
                valid = password == DEFAULT_PASSWORD
                if valid:
                    new_hash = hash_password(password)
                    cursor.execute(
                        "UPDATE SOCIO SET password_hash = %s, password_salt = '' WHERE id = %s",
                        (new_hash, socio["id"]),
                    )
                    socio["password_hash"] = new_hash

            if not valid:
                return error("Credenciales inválidas", 401)

            is_admin = socio.get("rol") == "ADMIN" or socio["email"] == "juan.sandoval@pucesa.edu.ec"
            conn.commit()
            return ok({"user": socio_public(socio), "is_admin": is_admin})
    except Exception as exc:
        conn.rollback()
        return error(str(exc), 500)
    finally:
        conn.close()


@app.route("/api/auth/register", methods=["POST"])
def register():
    return create_user()


@app.route("/api/users", methods=["GET", "POST"])
def users_collection():
    if request.method == "POST":
        return create_user()

    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM SOCIO ORDER BY nombre")
            return ok([socio_public(row) for row in cursor.fetchall()])
    finally:
        conn.close()


def create_user():
    data = parse_json()
    required = require_fields(data, ["nombre_completo", "email_institucional", "telefono_whatsapp"])
    if required:
        return error(required)

    email = data["email_institucional"].strip().lower()
    if not email.endswith("@pucesa.edu.ec"):
        return error("El correo debe pertenecer al dominio @pucesa.edu.ec")

    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO SOCIO (
                    nombre, email, telefono, password_hash, password_salt,
                    nivel_habilidad, rol, estado
                ) VALUES (%s, %s, %s, %s, '', %s, %s, %s)
                """,
                (
                    data["nombre_completo"].strip(),
                    email,
                    data["telefono_whatsapp"].strip(),
                    hash_password(data.get("password") or DEFAULT_PASSWORD),
                    normalize_level(data.get("nivel_habilidad")),
                    normalize_role(data.get("rol")),
                    normalize_socio_estado(data.get("estado")),
                ),
            )
            conn.commit()
            return ok({"message": "Socio agregado exitosamente", "id": cursor.lastrowid}, 201)
    except pymysql.err.IntegrityError:
        conn.rollback()
        return error("Ya existe un socio con ese correo", 409)
    except Exception as exc:
        conn.rollback()
        return error(str(exc), 400)
    finally:
        conn.close()


@app.route("/api/users/<int:user_id>", methods=["GET", "PUT", "DELETE"])
def user_detail(user_id):
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            if request.method == "GET":
                cursor.execute("SELECT * FROM SOCIO WHERE id = %s", (user_id,))
                socio = cursor.fetchone()
                return ok(socio_public(socio)) if socio else error("Socio no encontrado", 404)

            if request.method == "DELETE":
                cursor.execute("UPDATE SOCIO SET estado = 'INACTIVO' WHERE id = %s", (user_id,))
                conn.commit()
                return ok({"message": "Socio inactivado"})

            data = parse_json()
            mapping = {
                "nombre_completo": ("nombre", lambda value: value.strip()),
                "telefono_whatsapp": ("telefono", lambda value: value.strip()),
                "nivel_habilidad": ("nivel_habilidad", normalize_level),
                "rol": ("rol", normalize_role),
                "estado": ("estado", normalize_socio_estado),
            }
            updates = [(column, transform(data[field])) for field, (column, transform) in mapping.items() if field in data]
            if not updates:
                return error("No hay campos para actualizar")
            sql = ", ".join([f"{column} = %s" for column, _ in updates])
            cursor.execute(f"UPDATE SOCIO SET {sql} WHERE id = %s", [value for _, value in updates] + [user_id])
            conn.commit()
            return ok({"message": "Socio actualizado"})
    except Exception as exc:
        conn.rollback()
        return error(str(exc), 400)
    finally:
        conn.close()


@app.route("/api/inventario", methods=["GET", "POST"])
@app.route("/api/instrumentos", methods=["GET", "POST"])
def inventory_collection():
    if request.method == "POST":
        return create_inventory_item()

    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT i.id, i.nombre, i.tipo_instrumento_id, ti.nombre AS tipo,
                       i.marca, i.modelo, i.numero_serie, i.fecha_adquisicion,
                       i.estado, i.ubicacion, i.ultima_actualizacion,
                       CASE WHEN i.estado = 'DISPONIBLE' AND p.id IS NULL THEN 1 ELSE 0 END AS disponible
                FROM INSTRUMENTO i
                JOIN TIPO_INSTRUMENTO ti ON ti.id = i.tipo_instrumento_id
                LEFT JOIN PRESTAMO p ON p.instrumento_id = i.id
                    AND p.estado = 'ACTIVO'
                    AND p.eliminado_en IS NULL
                ORDER BY ti.nombre, i.nombre
                """
            )
            return ok(serialize_rows(cursor.fetchall()))
    finally:
        conn.close()


@app.route("/api/instrumentos/disponibles", methods=["GET"])
def available_instruments():
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT i.id, i.nombre, i.tipo_instrumento_id, ti.nombre AS tipo,
                       i.marca, i.modelo, i.numero_serie, i.estado, i.ubicacion
                FROM INSTRUMENTO i
                JOIN TIPO_INSTRUMENTO ti ON ti.id = i.tipo_instrumento_id
                LEFT JOIN PRESTAMO p ON p.instrumento_id = i.id
                    AND p.estado = 'ACTIVO'
                    AND p.eliminado_en IS NULL
                WHERE i.estado = 'DISPONIBLE' AND p.id IS NULL
                ORDER BY i.nombre
                """
            )
            return ok(serialize_rows(cursor.fetchall()))
    finally:
        conn.close()


def create_inventory_item():
    data = parse_json()
    required = require_fields(data, ["nombre", "tipo", "ubicacion"])
    if required:
        return error(required)

    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            tipo_id = get_or_create_tipo_instrumento(cursor, data.get("tipo"))
            numero_serie = (data.get("numero_serie") or f"AUTO-{datetime.now().strftime('%Y%m%d%H%M%S%f')}").strip()
            cursor.execute(
                """
                INSERT INTO INSTRUMENTO (
                    nombre, tipo_instrumento_id, marca, modelo, numero_serie,
                    fecha_adquisicion, estado, ubicacion, modificado_por
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    data["nombre"].strip(),
                    tipo_id,
                    data.get("marca") or None,
                    data.get("modelo") or None,
                    numero_serie,
                    data.get("fecha_adquisicion") or None,
                    normalize_instrumento_estado(data.get("estado")),
                    data["ubicacion"].strip(),
                    data.get("modificado_por", "API"),
                ),
            )
            conn.commit()
            return ok({"message": "Instrumento agregado exitosamente", "id": cursor.lastrowid}, 201)
    except Exception as exc:
        conn.rollback()
        return error(str(exc), 400)
    finally:
        conn.close()


@app.route("/api/inventario/<int:item_id>", methods=["GET", "PUT"])
@app.route("/api/instrumentos/<int:item_id>", methods=["GET", "PUT"])
def inventory_detail(item_id):
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            if request.method == "GET":
                cursor.execute(
                    """
                    SELECT i.*, ti.nombre AS tipo
                    FROM INSTRUMENTO i
                    JOIN TIPO_INSTRUMENTO ti ON ti.id = i.tipo_instrumento_id
                    WHERE i.id = %s
                    """,
                    (item_id,),
                )
                item = cursor.fetchone()
                return ok(serialize_row(item)) if item else error("Instrumento no encontrado", 404)

            data = parse_json()
            updates = []
            if "tipo" in data:
                updates.append(("tipo_instrumento_id", get_or_create_tipo_instrumento(cursor, data.get("tipo"))))
            for field in ["nombre", "marca", "modelo", "numero_serie", "ubicacion"]:
                if field in data:
                    updates.append((field, data[field]))
            if "estado" in data:
                updates.append(("estado", normalize_instrumento_estado(data.get("estado"))))
            updates.append(("modificado_por", data.get("modificado_por", "API")))
            sql = ", ".join([f"{field} = %s" for field, _ in updates])
            cursor.execute(f"UPDATE INSTRUMENTO SET {sql} WHERE id = %s", [value for _, value in updates] + [item_id])
            conn.commit()
            return ok({"message": "Instrumento actualizado"})
    except Exception as exc:
        conn.rollback()
        return error(str(exc), 400)
    finally:
        conn.close()


@app.route("/api/salas", methods=["GET", "POST"])
def rooms_collection():
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            if request.method == "POST":
                data = parse_json()
                required = require_fields(data, ["nombre", "capacidad"])
                if required:
                    return error(required)
                cursor.execute(
                    """
                    INSERT INTO SALA (nombre, tipo, capacidad, equipamiento, estado)
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    (
                        data["nombre"].strip(),
                        normalize_sala_tipo(data.get("tipo")),
                        int(data["capacidad"]),
                        data.get("equipamiento"),
                        normalize_sala_estado(data.get("estado")),
                    ),
                )
                conn.commit()
                return ok({"message": "Sala agregada", "id": cursor.lastrowid}, 201)

            cursor.execute("SELECT * FROM SALA ORDER BY nombre")
            return ok(serialize_rows(cursor.fetchall()))
    except Exception as exc:
        conn.rollback()
        return error(str(exc), 400)
    finally:
        conn.close()


@app.route("/api/salas/<int:sala_id>", methods=["PUT"])
def room_detail(sala_id):
    data = parse_json()
    updates = []
    for field in ["nombre", "capacidad", "equipamiento"]:
        if field in data:
            updates.append((field, data[field]))
    if "tipo" in data:
        updates.append(("tipo", normalize_sala_tipo(data.get("tipo"))))
    if "estado" in data:
        updates.append(("estado", normalize_sala_estado(data.get("estado"))))
    if not updates:
        return error("No hay campos para actualizar")

    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            sql = ", ".join([f"{field} = %s" for field, _ in updates])
            cursor.execute(f"UPDATE SALA SET {sql} WHERE id = %s", [value for _, value in updates] + [sala_id])
            conn.commit()
            return ok({"message": "Sala actualizada"})
    except Exception as exc:
        conn.rollback()
        return error(str(exc), 400)
    finally:
        conn.close()


@app.route("/api/reservas", methods=["GET", "POST"])
def reservations_collection():
    if request.method == "POST":
        return create_reservation()

    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT r.id, r.socio_id AS user_id, r.sala_id, r.fecha_inicio, r.fecha_fin,
                       r.estado, r.observaciones, r.fecha_creacion,
                       s.nombre AS nombre_completo, sa.nombre AS sala_nombre
                FROM RESERVA r
                JOIN SOCIO s ON s.id = r.socio_id
                JOIN SALA sa ON sa.id = r.sala_id
                WHERE r.eliminado_en IS NULL
                ORDER BY r.fecha_inicio DESC
                """
            )
            return ok(serialize_rows(cursor.fetchall()))
    finally:
        conn.close()


def check_reservation_rules(fecha_inicio, fecha_fin):
    from datetime import datetime, timedelta
    ahora_local = datetime.utcnow() - timedelta(hours=5)
    if fecha_inicio < ahora_local:
        return "La fecha de inicio no puede estar en el pasado"
    if fecha_fin <= fecha_inicio:
        return "La fecha de fin debe ser posterior al inicio"
    if fecha_inicio.date() != fecha_fin.date():
        return "La reserva debe iniciar y terminar el mismo día"
    
    if fecha_inicio.hour < 8 or fecha_fin.hour > 22 or (fecha_fin.hour == 22 and fecha_fin.minute > 0):
        return "Las reservas solo están permitidas entre las 08:00 y las 22:00"
    
    duracion = (fecha_fin - fecha_inicio).total_seconds() / 3600
    if duracion < 1:
        return "La reserva debe durar al menos 1 hora"
    if duracion > 4:
        return "La reserva no puede durar más de 4 horas"
    return None


@app.route("/api/reservas/validar", methods=["POST"])
def validate_reservation():
    data = parse_json()
    required = require_fields(data, ["sala_id", "fecha_inicio", "fecha_fin"])
    if required:
        return error(required)
    try:
        fecha_inicio = parse_datetime(data["fecha_inicio"], "fecha_inicio")
        fecha_fin = parse_datetime(data["fecha_fin"], "fecha_fin")
    except ValueError as exc:
        return error(str(exc))
    
    rule_error = check_reservation_rules(fecha_inicio, fecha_fin)
    if rule_error:
        return error(rule_error)

    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            available = not reservation_overlap(cursor, data["sala_id"], fecha_inicio, fecha_fin)
            return ok({"disponible": available})
    finally:
        conn.close()


def create_reservation():
    data = parse_json()
    required = require_fields(data, ["user_id", "sala_id", "fecha_inicio", "fecha_fin"])
    if required:
        return error(required)
    try:
        fecha_inicio = parse_datetime(data["fecha_inicio"], "fecha_inicio")
        fecha_fin = parse_datetime(data["fecha_fin"], "fecha_fin")
    except ValueError as exc:
        return error(str(exc))
    
    rule_error = check_reservation_rules(fecha_inicio, fecha_fin)
    if rule_error:
        return error(rule_error)

    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT estado FROM SALA WHERE id = %s", (data["sala_id"],))
            sala = cursor.fetchone()
            if not sala:
                return error("Sala no encontrada", 404)
            if sala["estado"] != "ACTIVA":
                return error("La sala no está activa")
            if reservation_overlap(cursor, data["sala_id"], fecha_inicio, fecha_fin):
                return error("La sala ya tiene una reserva en ese horario", 409)

            cursor.execute(
                """
                INSERT INTO RESERVA (
                    socio_id, sala_id, fecha_inicio, fecha_fin, estado,
                    observaciones, creado_por, modificado_por
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    data["user_id"],
                    data["sala_id"],
                    fecha_inicio,
                    fecha_fin,
                    normalize_reserva_estado(data.get("estado")),
                    data.get("observaciones"),
                    data.get("creado_por", "API"),
                    data.get("modificado_por", "API"),
                ),
            )
            reserva_id = cursor.lastrowid
            cursor.execute("SELECT nombre, telefono FROM SOCIO WHERE id = %s", (data["user_id"],))
            socio = cursor.fetchone()
            conn.commit()

            notified = False
            if socio:
                primer_nombre = socio["nombre"].split(" ")[0]
                notified = notify_whatsapp(
                    socio["telefono"],
                    f"Hola {primer_nombre}. Tu reserva de sala fue confirmada. Inicio: {fecha_inicio} Fin: {fecha_fin}.",
                )
            return ok({"message": "Reserva creada exitosamente", "id": reserva_id, "whatsapp_enviado": notified}, 201)
    except Exception as exc:
        conn.rollback()
        return error(str(exc), 400)
    finally:
        conn.close()


@app.route("/api/reservas/<int:user_id>", methods=["GET"])
def get_reservas_usuario(user_id):
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT r.id, r.socio_id AS user_id, r.sala_id, r.fecha_inicio, r.fecha_fin,
                       r.estado, r.observaciones, sa.nombre AS sala_nombre
                FROM RESERVA r
                JOIN SALA sa ON sa.id = r.sala_id
                WHERE r.socio_id = %s AND r.eliminado_en IS NULL
                ORDER BY r.fecha_inicio DESC
                """,
                (user_id,),
            )
            return ok(serialize_rows(cursor.fetchall()))
    finally:
        conn.close()


@app.route("/api/reservas/calendario", methods=["GET"])
def reservation_calendar():
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT r.id, r.fecha_inicio AS start, r.fecha_fin AS end, r.estado,
                       s.nombre AS nombre_completo, sa.nombre AS sala_nombre
                FROM RESERVA r
                JOIN SOCIO s ON s.id = r.socio_id
                JOIN SALA sa ON sa.id = r.sala_id
                WHERE r.eliminado_en IS NULL
                  AND r.estado IN ('CONFIRMADA', 'COMPLETADA', 'REPROGRAMADA')
                ORDER BY r.fecha_inicio
                """
            )
            events = []
            for row in serialize_rows(cursor.fetchall()):
                row["title"] = f"{row['sala_nombre']} - {row['nombre_completo']}"
                events.append(row)
            return ok(events)
    finally:
        conn.close()


@app.route("/api/reservas/<int:reserva_id>", methods=["DELETE"])
def cancel_reservation(reserva_id):
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                UPDATE RESERVA
                SET estado = 'CANCELADA', eliminado_en = NOW(), modificado_por = 'API'
                WHERE id = %s AND eliminado_en IS NULL
                """,
                (reserva_id,),
            )
            conn.commit()
            return ok({"message": "Reserva cancelada"})
    except Exception as exc:
        conn.rollback()
        return error(str(exc), 400)
    finally:
        conn.close()


@app.route("/api/prestamos", methods=["GET"])
def loans_collection():
    estado = request.args.get("estado")
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            sql = """
                SELECT p.id, p.socio_id AS user_id, p.instrumento_id AS inventario_id,
                       p.fecha_salida, p.fecha_limite, p.fecha_devolucion, p.estado,
                       p.observaciones, s.nombre AS nombre_completo,
                       i.nombre AS instrumento_nombre, ti.nombre AS tipo
                FROM PRESTAMO p
                JOIN SOCIO s ON s.id = p.socio_id
                JOIN INSTRUMENTO i ON i.id = p.instrumento_id
                JOIN TIPO_INSTRUMENTO ti ON ti.id = i.tipo_instrumento_id
                WHERE p.eliminado_en IS NULL
            """
            params = []
            if estado:
                sql += " AND p.estado = %s"
                params.append(normalize_prestamo_estado(estado))
            sql += " ORDER BY p.fecha_salida DESC"
            cursor.execute(sql, params)
            return ok(serialize_rows(cursor.fetchall()))
    finally:
        conn.close()


@app.route("/api/prestamos/activos", methods=["GET"])
def active_loans():
    return loans_by_status("ACTIVO")


def loans_by_status(status):
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT p.id, p.socio_id AS user_id, p.instrumento_id AS inventario_id,
                       p.fecha_salida, p.fecha_limite, p.fecha_devolucion, p.estado,
                       p.observaciones, s.nombre AS nombre_completo,
                       i.nombre AS instrumento_nombre, ti.nombre AS tipo
                FROM PRESTAMO p
                JOIN SOCIO s ON s.id = p.socio_id
                JOIN INSTRUMENTO i ON i.id = p.instrumento_id
                JOIN TIPO_INSTRUMENTO ti ON ti.id = i.tipo_instrumento_id
                WHERE p.estado = %s AND p.eliminado_en IS NULL
                ORDER BY p.fecha_limite
                """,
                (status,),
            )
            return ok(serialize_rows(cursor.fetchall()))
    finally:
        conn.close()


@app.route("/api/prestamos/solicitar", methods=["POST"])
def request_loan():
    data = parse_json()
    required = require_fields(data, ["user_id", "inventario_id", "fecha_limite"])
    if required:
        return error(required)

    try:
        fecha_limite = parse_date(data["fecha_limite"], "fecha_limite")
    except ValueError as exc:
        return error(str(exc))

    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT id, estado
                FROM INSTRUMENTO
                WHERE id = %s
                FOR UPDATE
                """,
                (data["inventario_id"],),
            )
            instrument = cursor.fetchone()
            if not instrument:
                return error("Instrumento no encontrado", 404)
            if instrument["estado"] != "DISPONIBLE":
                return error("El instrumento no está disponible", 409)

            cursor.execute(
                """
                SELECT id FROM PRESTAMO
                WHERE instrumento_id = %s AND estado = 'ACTIVO' AND eliminado_en IS NULL
                """,
                (data["inventario_id"],),
            )
            if cursor.fetchone():
                return error("El instrumento ya está prestado", 409)

            observaciones = data.get("observaciones") or data.get("evento_universidad") or ""
            documento = data.get("documento_garantia")
            if documento:
                observaciones = f"{observaciones} | Garantía: {documento}".strip(" |")
            cursor.execute(
                """
                INSERT INTO PRESTAMO (
                    socio_id, instrumento_id, fecha_limite, estado,
                    observaciones, creado_por, modificado_por
                ) VALUES (%s, %s, %s, 'ACTIVO', %s, %s, %s)
                """,
                (
                    data["user_id"],
                    data["inventario_id"],
                    fecha_limite,
                    observaciones,
                    data.get("creado_por", "API"),
                    data.get("modificado_por", "API"),
                ),
            )
            loan_id = cursor.lastrowid
            cursor.execute(
                "UPDATE INSTRUMENTO SET estado = 'PRESTADO', modificado_por = 'API' WHERE id = %s",
                (data["inventario_id"],),
            )
            conn.commit()
            return ok({"message": "Préstamo registrado", "id": loan_id}, 201)
    except Exception as exc:
        conn.rollback()
        return error(str(exc), 400)
    finally:
        conn.close()


@app.route("/api/prestamos/<int:prestamo_id>/devolver", methods=["POST"])
def return_loan(prestamo_id):
    data = parse_json()
    estado_instrumento = normalize_instrumento_estado(data.get("estado_instrumento", "DISPONIBLE"))
    if estado_instrumento == "PRESTADO":
        estado_instrumento = "DISPONIBLE"

    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT instrumento_id FROM PRESTAMO WHERE id = %s AND eliminado_en IS NULL",
                (prestamo_id,),
            )
            loan = cursor.fetchone()
            if not loan:
                return error("Préstamo no encontrado", 404)
            cursor.execute(
                """
                UPDATE PRESTAMO
                SET estado = 'DEVUELTO', fecha_devolucion = CURRENT_DATE, modificado_por = 'API'
                WHERE id = %s
                """,
                (prestamo_id,),
            )
            cursor.execute(
                "UPDATE INSTRUMENTO SET estado = %s, modificado_por = 'API' WHERE id = %s",
                (estado_instrumento, loan["instrumento_id"]),
            )
            conn.commit()
            return ok({"message": "Préstamo devuelto"})
    except Exception as exc:
        conn.rollback()
        return error(str(exc), 400)
    finally:
        conn.close()


@app.route("/api/dashboard/stats", methods=["GET"])
def dashboard_stats():
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            stats = {}
            queries = {
                "socios_activos": "SELECT COUNT(*) total FROM SOCIO WHERE estado = 'ACTIVO'",
                "instrumentos": "SELECT COUNT(*) total FROM INSTRUMENTO WHERE estado <> 'BAJA'",
                "salas_disponibles": "SELECT COUNT(*) total FROM SALA WHERE estado = 'ACTIVA'",
                "reservas_confirmadas": "SELECT COUNT(*) total FROM RESERVA WHERE estado = 'CONFIRMADA' AND eliminado_en IS NULL",
                "prestamos_activos": "SELECT COUNT(*) total FROM PRESTAMO WHERE estado = 'ACTIVO' AND eliminado_en IS NULL",
            }
            for key, sql in queries.items():
                cursor.execute(sql)
                stats[key] = cursor.fetchone()["total"]
            cursor.execute(
                """
                SELECT r.id, r.fecha_inicio, s.nombre AS nombre_completo, sa.nombre AS sala_nombre, r.estado
                FROM RESERVA r
                JOIN SOCIO s ON s.id = r.socio_id
                JOIN SALA sa ON sa.id = r.sala_id
                WHERE r.fecha_inicio >= NOW()
                  AND r.estado = 'CONFIRMADA'
                  AND r.eliminado_en IS NULL
                ORDER BY r.fecha_inicio
                LIMIT 5
                """
            )
            stats["proximas_reservas"] = serialize_rows(cursor.fetchall())
            return ok(stats)
    finally:
        conn.close()


@app.route("/api/auditoria/reservas", methods=["GET"])
def audit_reservations():
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM AUDITORIA_RESERVA ORDER BY fecha_cambio DESC LIMIT 100")
            return ok(serialize_rows(cursor.fetchall()))
    finally:
        conn.close()


@app.route("/api/auditoria/prestamos", methods=["GET"])
def audit_loans():
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM AUDITORIA_PRESTAMO ORDER BY fecha_cambio DESC LIMIT 100")
            return ok(serialize_rows(cursor.fetchall()))
    finally:
        conn.close()


@app.route("/api/auditoria/instrumentos", methods=["GET"])
def audit_instruments():
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM AUDITORIA_INSTRUMENTO ORDER BY fecha_cambio DESC LIMIT 100")
            return ok(serialize_rows(cursor.fetchall()))
    finally:
        conn.close()


@app.route("/api/trigger_notifications", methods=["POST"])
def trigger_notifications():
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            now = datetime.now()
            target = now + timedelta(minutes=30)
            cursor.execute(
                """
                SELECT r.id, r.fecha_inicio, s.telefono, s.nombre
                FROM RESERVA r
                JOIN SOCIO s ON r.socio_id = s.id
                WHERE r.estado = 'CONFIRMADA'
                  AND r.eliminado_en IS NULL
                  AND r.fecha_inicio BETWEEN %s AND %s
                """,
                (now, target),
            )
            sent = 0
            for res in cursor.fetchall():
                primer_nombre = res["nombre"].split(" ")[0]
                if notify_whatsapp(res["telefono"], f"Recordatorio {primer_nombre}: tienes un ensayo a las {res['fecha_inicio']}."):
                    sent += 1
            return ok({"message": f"Notificaciones enviadas: {sent}"})
    finally:
        conn.close()

@app.route("/api/statistics/loans", methods=["GET"])
def statistics_loans():
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            # Stats grouped by Tipo de Instrumento
            cursor.execute(
                """
                SELECT ti.nombre AS name, COUNT(p.id) AS value
                FROM PRESTAMO p
                JOIN INSTRUMENTO i ON i.id = p.instrumento_id
                JOIN TIPO_INSTRUMENTO ti ON ti.id = i.tipo_instrumento_id
                WHERE p.eliminado_en IS NULL
                GROUP BY ti.id, ti.nombre
                ORDER BY value DESC
                """
            )
            by_type = cursor.fetchall()

            # Stats grouped by Instrumento Específico
            cursor.execute(
                """
                SELECT i.nombre AS name, COUNT(p.id) AS value
                FROM PRESTAMO p
                JOIN INSTRUMENTO i ON i.id = p.instrumento_id
                WHERE p.eliminado_en IS NULL
                GROUP BY i.id, i.nombre
                ORDER BY value DESC
                """
            )
            by_instrument = cursor.fetchall()
            
            return ok({
                "by_type": by_type,
                "by_instrument": by_instrument
            })
    except Exception as exc:
        return error(str(exc), 400)
    finally:
        conn.close()
if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
