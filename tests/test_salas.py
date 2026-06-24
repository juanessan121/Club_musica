import uuid
import requests
from tests.conftest import BASE_URL


def _nueva_sala():
    return {
        "nombre": f"Sala Test {uuid.uuid4().hex[:8]}",
        "tipo": "CUBICULO",
        "capacidad": 4,
        "estado": "ACTIVA",
    }


def test_listar_salas_sin_auth():
    r = requests.get(f"{BASE_URL}/salas")
    assert r.status_code == 401


def test_listar_salas_admin(admin_headers):
    r = requests.get(f"{BASE_URL}/salas", headers=admin_headers)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_listar_salas_socio(socio_headers):
    r = requests.get(f"{BASE_URL}/salas", headers=socio_headers)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_salas_tienen_campos_esperados(admin_headers):
    r = requests.get(f"{BASE_URL}/salas", headers=admin_headers)
    salas = r.json()
    if not salas:
        return
    sala = salas[0]
    for campo in ("id", "nombre", "capacidad", "estado"):
        assert campo in sala, f"Campo '{campo}' faltante en sala"


def test_crear_sala_admin(admin_headers):
    r = requests.post(f"{BASE_URL}/salas", json=_nueva_sala(), headers=admin_headers)
    assert r.status_code == 201
    body = r.json()
    assert "id" in body or "message" in body


def test_crear_sala_socio_prohibido(socio_headers):
    r = requests.post(f"{BASE_URL}/salas", json=_nueva_sala(), headers=socio_headers)
    assert r.status_code == 403


def test_crear_sala_sin_nombre(admin_headers):
    datos = {k: v for k, v in _nueva_sala().items() if k != "nombre"}
    r = requests.post(f"{BASE_URL}/salas", json=datos, headers=admin_headers)
    assert r.status_code == 400


def test_crear_sala_sin_capacidad(admin_headers):
    datos = {k: v for k, v in _nueva_sala().items() if k != "capacidad"}
    r = requests.post(f"{BASE_URL}/salas", json=datos, headers=admin_headers)
    assert r.status_code == 400


def test_crear_sala_sin_auth():
    r = requests.post(f"{BASE_URL}/salas", json=_nueva_sala())
    assert r.status_code == 401


def test_sala_estado_valido(admin_headers):
    r = requests.get(f"{BASE_URL}/salas", headers=admin_headers)
    estados_validos = {"ACTIVA", "INACTIVA", "MANTENIMIENTO"}
    for sala in r.json():
        assert sala["estado"] in estados_validos, f"Estado de sala inválido: {sala['estado']}"
