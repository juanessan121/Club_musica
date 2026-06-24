import pytest
import requests
from datetime import datetime, timedelta
from tests.conftest import BASE_URL, is_within_operating_hours


def _fecha_laboral_futura(dias=1, hora=10):
    ecuador = datetime.utcnow() - timedelta(hours=5)
    candidate = ecuador + timedelta(days=dias)
    while candidate.weekday() >= 5:
        candidate += timedelta(days=1)
    return candidate.replace(hour=hora, minute=0, second=0, microsecond=0).strftime("%Y-%m-%dT%H:%M")


def test_listar_prestamos_sin_auth():
    r = requests.get(f"{BASE_URL}/prestamos")
    assert r.status_code == 401


def test_listar_prestamos_admin(admin_headers):
    r = requests.get(f"{BASE_URL}/prestamos", headers=admin_headers)
    assert r.status_code == 200
    body = r.json()
    assert isinstance(body, (list, dict))


def test_listar_prestamos_socio(socio_headers):
    r = requests.get(f"{BASE_URL}/prestamos", headers=socio_headers)
    assert r.status_code == 200


def test_prestamos_tienen_campos_esperados(admin_headers):
    r = requests.get(f"{BASE_URL}/prestamos", headers=admin_headers)
    items = r.json() if isinstance(r.json(), list) else r.json().get("data", [])
    if not items:
        return
    p = items[0]
    for campo in ("id", "estado", "fecha_salida"):
        assert campo in p, f"Campo '{campo}' faltante en préstamo"


def test_solicitar_prestamo_instrumento_inexistente(admin_headers, admin_user):
    if not is_within_operating_hours():
        pytest.skip("Fuera del horario operativo — préstamos bloqueados")
    payload = {
        "user_id": admin_user["id"],
        "inventario_id": 999999,
        "motivo": "Test pytest",
        "documento_garantia": "Cédula de Identidad",
        "fecha_salida": _fecha_laboral_futura(1),
        "fecha_limite": _fecha_laboral_futura(3),
    }
    r = requests.post(f"{BASE_URL}/prestamos/solicitar", json=payload, headers=admin_headers)
    assert r.status_code == 404


def test_solicitar_prestamo_sin_auth(primer_instrumento_disponible):
    if primer_instrumento_disponible is None:
        pytest.skip("No hay instrumentos disponibles para el test")
    payload = {
        "user_id": 1,
        "inventario_id": primer_instrumento_disponible["id"],
        "motivo": "Test",
        "documento_garantia": "Cédula de Identidad",
        "fecha_salida": _fecha_laboral_futura(1),
        "fecha_limite": _fecha_laboral_futura(3),
    }
    r = requests.post(f"{BASE_URL}/prestamos/solicitar", json=payload)
    assert r.status_code == 401


def test_solicitar_prestamo_campos_requeridos(admin_headers, admin_user):
    if not is_within_operating_hours():
        pytest.skip("Fuera del horario operativo — préstamos bloqueados")
    r = requests.post(f"{BASE_URL}/prestamos/solicitar", json={"user_id": admin_user["id"]}, headers=admin_headers)
    assert r.status_code == 400


def test_solicitar_prestamo_fecha_limite_anterior(admin_headers, admin_user, primer_instrumento_disponible):
    if not is_within_operating_hours():
        pytest.skip("Fuera del horario operativo — préstamos bloqueados")
    if primer_instrumento_disponible is None:
        pytest.skip("No hay instrumentos disponibles para el test")
    payload = {
        "user_id": admin_user["id"],
        "inventario_id": primer_instrumento_disponible["id"],
        "motivo": "Test pytest",
        "documento_garantia": "Cédula de Identidad",
        "fecha_salida": _fecha_laboral_futura(3),
        "fecha_limite": _fecha_laboral_futura(1),
    }
    r = requests.post(f"{BASE_URL}/prestamos/solicitar", json=payload, headers=admin_headers)
    assert r.status_code == 400


def test_solicitar_y_devolver_prestamo(admin_headers, admin_user, primer_instrumento_disponible):
    if not is_within_operating_hours():
        pytest.skip("Fuera del horario operativo — préstamos bloqueados")
    if primer_instrumento_disponible is None:
        pytest.skip("No hay instrumentos disponibles para el test")
    payload = {
        "user_id": admin_user["id"],
        "inventario_id": primer_instrumento_disponible["id"],
        "motivo": "Test préstamo pytest",
        "documento_garantia": "Cédula de Identidad",
        "fecha_salida": _fecha_laboral_futura(1),
        "fecha_limite": _fecha_laboral_futura(5),
    }
    r_create = requests.post(f"{BASE_URL}/prestamos/solicitar", json=payload, headers=admin_headers)
    assert r_create.status_code == 201, f"No se pudo crear préstamo: {r_create.text}"
    prestamo_id = r_create.json().get("id")
    assert prestamo_id

    r_return = requests.post(
        f"{BASE_URL}/prestamos/{prestamo_id}/devolver",
        json={"estado_instrumento": "DISPONIBLE"},
        headers=admin_headers,
    )
    assert r_return.status_code == 200


def test_devolver_prestamo_inexistente(admin_headers):
    r = requests.post(
        f"{BASE_URL}/prestamos/999999/devolver",
        json={"estado_instrumento": "DISPONIBLE"},
        headers=admin_headers,
    )
    assert r.status_code in (404, 400)
