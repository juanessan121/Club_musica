import pytest
import requests
from datetime import datetime, timedelta

# Tests van directo a Flask (puerto 5000) para evitar el rate limit de nginx
# en /api/auth/ (5r/m burst=5) que bloquea la suite de 76 tests.
BASE_URL = "http://localhost:5000/api"
BASE_URL_NGINX = "http://localhost:8088/api"

ADMIN_EMAIL = "juan.sandoval@pucesa.edu.ec"
SOCIO_EMAIL = "braulio.silva@pucesa.edu.ec"
PASSWORD = "Musica2026!"


def _login(email, password=PASSWORD):
    r = requests.post(f"{BASE_URL}/auth/login", json={"email": email, "password": password})
    return r


@pytest.fixture(scope="session")
def admin_login():
    r = _login(ADMIN_EMAIL)
    assert r.status_code == 200, f"Admin login failed: {r.text}"
    return r.json()


@pytest.fixture(scope="session")
def socio_login():
    r = _login(SOCIO_EMAIL)
    assert r.status_code == 200, f"Socio login failed: {r.text}"
    return r.json()


@pytest.fixture(scope="session")
def admin_token(admin_login):
    return admin_login["token"]


@pytest.fixture(scope="session")
def socio_token(socio_login):
    return socio_login["token"]


@pytest.fixture(scope="session")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture(scope="session")
def socio_headers(socio_token):
    return {"Authorization": f"Bearer {socio_token}"}


@pytest.fixture(scope="session")
def admin_user(admin_login):
    return admin_login["user"]


@pytest.fixture(scope="session")
def socio_user(socio_login):
    return socio_login["user"]


@pytest.fixture(scope="session")
def primera_sala(admin_headers):
    r = requests.get(f"{BASE_URL}/salas", headers=admin_headers)
    assert r.status_code == 200
    salas = r.json()
    assert len(salas) > 0, "No hay salas en la BD para tests"
    return salas[0]


@pytest.fixture(scope="session")
def primer_instrumento_disponible(admin_headers):
    r = requests.get(f"{BASE_URL}/inventario", headers=admin_headers)
    assert r.status_code == 200
    items = r.json()
    disponibles = [i for i in items if i.get("disponible") and i.get("estado") == "DISPONIBLE"]
    return disponibles[0] if disponibles else None


def next_reservation_slot():
    """Próximo día hábil (lun-vie) con franja 15:00-17:00 hora Ecuador."""
    ecuador = datetime.utcnow() - timedelta(hours=5)
    candidate = ecuador + timedelta(days=1)
    while candidate.weekday() >= 5:
        candidate += timedelta(days=1)
    inicio = candidate.replace(hour=15, minute=0, second=0, microsecond=0)
    fin = candidate.replace(hour=17, minute=0, second=0, microsecond=0)
    return inicio.strftime("%Y-%m-%dT%H:%M"), fin.strftime("%Y-%m-%dT%H:%M")


def is_within_operating_hours():
    ecuador = datetime.utcnow() - timedelta(hours=5)
    weekday = ecuador.weekday()
    if weekday == 6:
        return False
    if weekday == 5 and ecuador.hour >= 12:
        return False
    return True
