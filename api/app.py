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
# USERS
# =============================================================================
@app.route('/api/users', methods=['GET'])
def get_users():
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM Users")
            result = cursor.fetchall()
            return jsonify(result), 200
    finally:
        conn.close()

# =============================================================================
# INVENTARIO
# =============================================================================
@app.route('/api/inventario', methods=['GET'])
def get_inventario():
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM Inventario")
            result = cursor.fetchall()
            return jsonify(result), 200
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
            cursor.execute("SELECT telefono_whatsapp FROM Users WHERE id = %s", (user_id,))
            user = cursor.fetchone()
            if user:
                requests.post(f"{WHATSAPP_BRIDGE_URL}/send", json={
                    "number": user['telefono_whatsapp'],
                    "message": f"Tu reserva ha sido confirmada para {fecha_inicio}."
                })
                
            return jsonify({"message": "Reserva creada exitosamente"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400
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
                SELECT r.id, r.fecha_inicio, u.telefono_whatsapp 
                FROM Reservas r
                JOIN Users u ON r.user_id = u.id
                WHERE r.fecha_notificacion_enviada = FALSE
                AND r.estado = 'confirmada'
            """)
            reservas = cursor.fetchall()
            
            for res in reservas:
                try:
                    # Enviar WhatsApp
                    response = requests.post(f"{WHATSAPP_BRIDGE_URL}/send", json={
                        "number": res['telefono_whatsapp'],
                        "message": f"Recordatorio: Tienes un ensayo a las {res['fecha_inicio']} (en 30 minutos)."
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
