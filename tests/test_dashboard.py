import requests
from tests.conftest import BASE_URL

ADMIN_STAT_KEYS = {"socios_activos", "instrumentos", "salas_disponibles", "reservas_confirmadas", "prestamos_activos"}
SOCIO_STAT_KEYS = {"reservas_confirmadas", "prestamos_activos"}


def test_stats_sin_auth():
    r = requests.get(f"{BASE_URL}/dashboard/stats")
    assert r.status_code == 401


def test_stats_admin_ok(admin_headers):
    r = requests.get(f"{BASE_URL}/dashboard/stats", headers=admin_headers)
    assert r.status_code == 200


def test_stats_admin_contiene_claves(admin_headers):
    r = requests.get(f"{BASE_URL}/dashboard/stats", headers=admin_headers)
    body = r.json()
    for key in ADMIN_STAT_KEYS:
        assert key in body, f"Falta clave '{key}' en stats de admin"


def test_stats_admin_valores_numericos(admin_headers):
    r = requests.get(f"{BASE_URL}/dashboard/stats", headers=admin_headers)
    body = r.json()
    for key in ADMIN_STAT_KEYS:
        assert isinstance(body[key], (int, float)), f"'{key}' debería ser número, got {type(body[key])}"


def test_stats_socio_ok(socio_headers):
    r = requests.get(f"{BASE_URL}/dashboard/stats", headers=socio_headers)
    assert r.status_code == 200


def test_stats_socio_contiene_claves(socio_headers):
    r = requests.get(f"{BASE_URL}/dashboard/stats", headers=socio_headers)
    body = r.json()
    for key in SOCIO_STAT_KEYS:
        assert key in body, f"Falta clave '{key}' en stats de socio"
