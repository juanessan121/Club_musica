import os
import pymysql
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime, timedelta

app = Flask(__name__)
CORS(app)

DB_HOST = os.environ.get('DB_HOST', 'db-mariadb')
DB_USER = os.environ.get('DB_USER', 'clubmusica')
DB_PASSWORD = os.environ.get('DB_PASSWORD', 'clubmusica_secret_2026')
DB_NAME = os.environ.get('DB_NAME', 'club_musica')
WHATSAPP_BRIDGE_URL = os.environ.get('WHATSAPP_BRIDGE_URL', 'http://whatsapp-bridge:3002')

def get_db_connection():
    return pymysql.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        cursorclass=pymysql.cursors.DictCursor
    )

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy"}), 200

# =============================================================================
# AUTH
# =============================================================================
@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM Users WHERE email_institucional = %s", (email,))
            user = cursor.fetchone()
            if user:
                # Consideramos a Juan Sandoval como administrador para la prueba
                is_admin = (user['email_institucional'] == 'juan.sandoval@pucesa.edu.ec')
                return jsonify({"user": user, "is_admin": is_admin}), 200
            else:
                return jsonify({"error": "Usuario no encontrado"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

# =============================================================================
# USERS
# =============================================================================
@app.route('/api/users', methods=['GET', 'POST'])
def get_or_create_users():
    conn = get_db_connection()
    try:
        if request.method == 'POST':
            data = request.json
            nombre_completo = data.get('nombre_completo')
            email_institucional = data.get('email_institucional')
            telefono_whatsapp = data.get('telefono_whatsapp')
            instrumento_principal = data.get('instrumento_principal')

            if not email_institucional.endswith('@pucesa.edu.ec'):
                return jsonify({"error": "El correo debe pertenecer al dominio @pucesa.edu.ec"}), 400

            with conn.cursor() as cursor:
                cursor.execute(
                    "INSERT INTO Users (nombre_completo, email_institucional, telefono_whatsapp, instrumento_principal) VALUES (%s, %s, %s, %s)",
                    (nombre_completo, email_institucional, telefono_whatsapp, instrumento_principal)
                )
                conn.commit()
                return jsonify({"message": "Socio agregado exitosamente"}), 201

        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM Users")
            result = cursor.fetchall()
            return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400
    finally:
        conn.close()

# =============================================================================
# INVENTARIO
# =============================================================================
@app.route('/api/inventario', methods=['GET', 'POST'])
def get_or_create_inventario():
    conn = get_db_connection()
    try:
        if request.method == 'POST':
            data = request.json
            nombre = data.get('nombre')
            tipo = data.get('tipo')
            marca = data.get('marca', '')
            modelo = data.get('modelo', '')
            estado = data.get('estado', 'excelente')
            ubicacion = data.get('ubicacion')
            
            with conn.cursor() as cursor:
                cursor.execute(
                    "INSERT INTO Inventario (nombre, tipo, marca, modelo, estado, ubicacion) VALUES (%s, %s, %s, %s, %s, %s)",
                    (nombre, tipo, marca, modelo, estado, ubicacion)
                )
                conn.commit()
                return jsonify({"message": "Instrumento agregado exitosamente"}), 201
                
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM Inventario")
            result = cursor.fetchall()
            return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400
    finally:
        conn.close()

# =============================================================================
# RESERVAS
# =============================================================================
@app.route('/api/reservas', methods=['POST'])
def create_reserva():
    data = request.json
    user_id = data.get('user_id')
    fecha_inicio = data.get('fecha_inicio')
    fecha_fin = data.get('fecha_fin')

    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "INSERT INTO Reservas (user_id, fecha_inicio, fecha_fin) VALUES (%s, %s, %s)",
                (user_id, fecha_inicio, fecha_fin)
            )
            conn.commit()
            
            # Send WhatsApp confirmation via bridge
            cursor.execute("SELECT nombre_completo, telefono_whatsapp FROM Users WHERE id = %s", (user_id,))
            user = cursor.fetchone()
            if user:
                primer_nombre = user['nombre_completo'].split(' ')[0]
                mensaje = f"¡Hola {primer_nombre}! 🎵🎸\nTu reserva de sala en el Club de Música ha sido confirmada con éxito.\n\n📅 Inicio: {fecha_inicio}\n⏳ Fin: {fecha_fin}\n\n¡Que tengas un excelente ensayo!"
                
                requests.post(f"{WHATSAPP_BRIDGE_URL}/send", json={
                    "number": user['telefono_whatsapp'],
                    "message": mensaje
                })
                
            return jsonify({"message": "Reserva creada exitosamente"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400
    finally:
        conn.close()

@app.route('/api/reservas/<int:user_id>', methods=['GET'])
def get_reservas_usuario(user_id):
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM Reservas WHERE user_id = %s ORDER BY fecha_inicio DESC", (user_id,))
            result = cursor.fetchall()
            # Format dates to string to prevent serialization errors
            for row in result:
                if row['fecha_inicio']:
                    row['fecha_inicio'] = row['fecha_inicio'].strftime('%Y-%m-%d %H:%M:%S')
                if row['fecha_fin']:
                    row['fecha_fin'] = row['fecha_fin'].strftime('%Y-%m-%d %H:%M:%S')
            return jsonify(result), 200
    finally:
        conn.close()

# =============================================================================
# AUTOMATIZACIÓN (Cron/Job simulation for notifications)
# =============================================================================
@app.route('/api/trigger_notifications', methods=['POST'])
def trigger_notifications():
    # Buscar reservas que empiezan en 30 min y no se han notificado
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            now = datetime.now()
            target_time = now + timedelta(minutes=30)
            
            # Simplified query for logic implementation
            cursor.execute("""
                SELECT r.id, r.fecha_inicio, u.telefono_whatsapp, u.nombre_completo 
                FROM Reservas r
                JOIN Users u ON r.user_id = u.id
                WHERE r.fecha_notificacion_enviada = FALSE
                AND r.estado = 'confirmada'
            """)
            reservas = cursor.fetchall()
            
            for res in reservas:
                try:
                    primer_nombre = res['nombre_completo'].split(' ')[0]
                    # Enviar WhatsApp
                    response = requests.post(f"{WHATSAPP_BRIDGE_URL}/send", json={
                        "number": res['telefono_whatsapp'],
                        "message": f"¡Recordatorio {primer_nombre}! ⏰\nTienes un ensayo a las {res['fecha_inicio']} (en 30 minutos). ¡Te esperamos!"
                    })
                    if response.status_code == 200:
                        cursor.execute("UPDATE Reservas SET fecha_notificacion_enviada = TRUE WHERE id = %s", (res['id'],))
                except Exception as e:
                    print(f"Error notifying {res['id']}: {e}")
            conn.commit()
            return jsonify({"message": f"Notificaciones enviadas: {len(reservas)}"}), 200
    finally:
        conn.close()

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')
