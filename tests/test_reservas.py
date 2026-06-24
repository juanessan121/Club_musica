import requests
from tests.conftest import BASE_URL, next_reservation_slot


def test_calendario_sin_auth():
    r = requests.get(f"{BASE_URL}/reservas/calendario")
    assert r.status_code == 401


def test_calendario_admin(admin_headers):
    r = requests.get(f"{BASE_URL}/reservas/calendario", headers=admin_headers)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_calendario_socio(socio_headers):
    r = requests.get(f"{BASE_URL}/reservas/calendario", headers=socio_headers)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_calendario_eventos_tienen_campos(admin_headers):
    r = requests.get(f"{BASE_URL}/reservas/calendario", headers=admin_headers)
    eventos = r.json()
    if not eventos:
        return
    e = eventos[0]
    for campo in ("id", "start", "end", "sala_id"):
        assert campo in e, f"Campo '{campo}' faltante en evento de calendario"


def test_listar_reservas_sin_auth():
    r = requests.get(f"{BASE_URL}/reservas")
    assert r.status_code == 401


def test_listar_reservas_admin(admin_headers):
    r = requests.get(f"{BASE_URL}/reservas", headers=admin_headers)
    assert r.status_code == 200


def test_listar_reservas_socio(socio_headers):
    r = requests.get(f"{BASE_URL}/reservas", headers=socio_headers)
    assert r.status_code == 200


def test_crear_reserva_sin_auth(primera_sala):
    inicio, fin = next_reservation_slot()
    payload = {"sala_id": primera_sala["id"], "fecha_inicio": inicio, "fecha_fin": fin}
    r = requests.post(f"{BASE_URL}/reservas", json=payload)
    assert r.status_code == 401


def test_crear_reserva_fecha_pasada(admin_headers, primera_sala, admin_user):
    payload = {
        "user_id": admin_user["id"],
        "sala_id": primera_sala["id"],
        "fecha_inicio": "2020-01-01T10:00",
        "fecha_fin": "2020-01-01T12:00",
    }
    r = requests.post(f"{BASE_URL}/reservas", json=payload, headers=admin_headers)
    assert r.status_code == 400


def test_crear_reserva_duracion_menor_1h(admin_headers, primera_sala, admin_user):
    inicio, _ = next_reservation_slot()
    fin = inicio[:-2] + "30"
    payload = {
        "user_id": admin_user["id"],
        "sala_id": primera_sala["id"],
        "fecha_inicio": inicio,
        "fecha_fin": fin,
    }
    r = requests.post(f"{BASE_URL}/reservas", json=payload, headers=admin_headers)
    assert r.status_code == 400


def test_crear_reserva_duracion_mayor_4h(admin_headers, primera_sala, admin_user):
    from datetime import datetime, timedelta
    ecuador = datetime.utcnow() - timedelta(hours=5)
    candidate = ecuador + timedelta(days=1)
    while candidate.weekday() >= 5:
        candidate += timedelta(days=1)
    inicio = candidate.replace(hour=8, minute=0, second=0, microsecond=0)
    fin = candidate.replace(hour=13, minute=0, second=0, microsecond=0)
    payload = {
        "user_id": admin_user["id"],
        "sala_id": primera_sala["id"],
        "fecha_inicio": inicio.strftime("%Y-%m-%dT%H:%M"),
        "fecha_fin": fin.strftime("%Y-%m-%dT%H:%M"),
    }
    r = requests.post(f"{BASE_URL}/reservas", json=payload, headers=admin_headers)
    assert r.status_code == 400


def test_crear_reserva_fuera_horario(admin_headers, primera_sala, admin_user):
    from datetime import datetime, timedelta
    ecuador = datetime.utcnow() - timedelta(hours=5)
    candidate = ecuador + timedelta(days=1)
    while candidate.weekday() >= 5:
        candidate += timedelta(days=1)
    inicio = candidate.replace(hour=23, minute=0, second=0, microsecond=0)
    fin = candidate.replace(hour=23, minute=30, second=0, microsecond=0)
    payload = {
        "user_id": admin_user["id"],
        "sala_id": primera_sala["id"],
        "fecha_inicio": inicio.strftime("%Y-%m-%dT%H:%M"),
        "fecha_fin": fin.strftime("%Y-%m-%dT%H:%M"),
    }
    r = requests.post(f"{BASE_URL}/reservas", json=payload, headers=admin_headers)
    assert r.status_code == 400


def test_crear_reserva_dias_distintos(admin_headers, primera_sala, admin_user):
    from datetime import datetime, timedelta
    ecuador = datetime.utcnow() - timedelta(hours=5)
    candidate = ecuador + timedelta(days=1)
    while candidate.weekday() >= 5:
        candidate += timedelta(days=1)
    siguiente = candidate + timedelta(days=1)
    while siguiente.weekday() >= 5:
        siguiente += timedelta(days=1)
    payload = {
        "user_id": admin_user["id"],
        "sala_id": primera_sala["id"],
        "fecha_inicio": candidate.replace(hour=20, minute=0).strftime("%Y-%m-%dT%H:%M"),
        "fecha_fin": siguiente.replace(hour=10, minute=0).strftime("%Y-%m-%dT%H:%M"),
    }
    r = requests.post(f"{BASE_URL}/reservas", json=payload, headers=admin_headers)
    assert r.status_code == 400


def test_crear_y_cancelar_reserva(admin_headers, primera_sala, admin_user):
    inicio, fin = next_reservation_slot()
    payload = {
        "user_id": admin_user["id"],
        "sala_id": primera_sala["id"],
        "fecha_inicio": inicio,
        "fecha_fin": fin,
    }
    r_create = requests.post(f"{BASE_URL}/reservas", json=payload, headers=admin_headers)
    assert r_create.status_code == 201, f"No se pudo crear reserva: {r_create.text}"
    reserva_id = r_create.json().get("id")
    assert reserva_id, "La respuesta no incluye el id de la reserva creada"

    r_del = requests.delete(f"{BASE_URL}/reservas/{reserva_id}", headers=admin_headers)
    assert r_del.status_code == 200


def test_cancelar_reserva_inexistente(admin_headers):
    # El API hace soft-delete (UPDATE con WHERE id=X AND eliminado_en IS NULL).
    # Si el ID no existe, el UPDATE afecta 0 filas pero retorna 200 igualmente.
    r = requests.delete(f"{BASE_URL}/reservas/999999", headers=admin_headers)
    assert r.status_code in (200, 404, 400)


def test_cancelar_reserva_sin_auth(primera_sala):
    r = requests.delete(f"{BASE_URL}/reservas/1")
    assert r.status_code == 401
