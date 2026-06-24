import uuid
import requests
from tests.conftest import BASE_URL


def _nuevo_instrumento():
    return {
        "nombre": "Guitarra Test Pytest",
        "tipo": "Guitarra Eléctrica",
        "marca": "Fender",
        "modelo": "Stratocaster",
        "numero_serie": f"TEST-{uuid.uuid4().hex[:10].upper()}",
        "estado": "DISPONIBLE",
        "ubicacion": "Sala de pruebas",
    }


def test_listar_inventario_sin_auth():
    r = requests.get(f"{BASE_URL}/inventario")
    assert r.status_code == 401


def test_listar_inventario_admin(admin_headers):
    r = requests.get(f"{BASE_URL}/inventario", headers=admin_headers)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_listar_inventario_socio(socio_headers):
    r = requests.get(f"{BASE_URL}/inventario", headers=socio_headers)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_instrumentos_tienen_campos_esperados(admin_headers):
    r = requests.get(f"{BASE_URL}/inventario", headers=admin_headers)
    items = r.json()
    if not items:
        return
    item = items[0]
    for campo in ("id", "nombre", "estado", "disponible"):
        assert campo in item, f"Campo '{campo}' faltante en instrumento"


def test_crear_instrumento_admin(admin_headers):
    r = requests.post(f"{BASE_URL}/inventario", json=_nuevo_instrumento(), headers=admin_headers)
    assert r.status_code == 201
    body = r.json()
    assert "id" in body or "message" in body


def test_crear_instrumento_socio_prohibido(socio_headers):
    r = requests.post(f"{BASE_URL}/inventario", json=_nuevo_instrumento(), headers=socio_headers)
    assert r.status_code == 403


def test_crear_instrumento_sin_nombre(admin_headers):
    datos = {k: v for k, v in _nuevo_instrumento().items() if k != "nombre"}
    r = requests.post(f"{BASE_URL}/inventario", json=datos, headers=admin_headers)
    assert r.status_code == 400


def test_crear_instrumento_sin_auth():
    r = requests.post(f"{BASE_URL}/inventario", json=_nuevo_instrumento())
    assert r.status_code == 401


def test_instrumento_estado_valido(admin_headers):
    r = requests.get(f"{BASE_URL}/inventario", headers=admin_headers)
    items = r.json()
    estados_validos = {"DISPONIBLE", "PRESTADO", "MANTENIMIENTO", "BAJA"}
    for item in items:
        assert item["estado"] in estados_validos, f"Estado inválido: {item['estado']}"
