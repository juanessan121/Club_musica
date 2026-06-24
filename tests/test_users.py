import uuid
import requests
from tests.conftest import BASE_URL


def _email_unico():
    sufijo = uuid.uuid4().hex[:8]
    return f"pytest.{sufijo}@pucesa.edu.ec"


NUEVO_SOCIO_BASE = {
    "nombre_completo": "Usuario Pytest",
    "nivel_habilidad": "PRINCIPIANTE",
    "rol": "SOCIO",
    "telefono_whatsapp": "0991234567",
}


def test_listar_usuarios_sin_auth():
    r = requests.get(f"{BASE_URL}/users")
    assert r.status_code == 401


def test_listar_usuarios_socio_prohibido(socio_headers):
    r = requests.get(f"{BASE_URL}/users", headers=socio_headers)
    assert r.status_code == 403


def test_listar_usuarios_admin(admin_headers):
    r = requests.get(f"{BASE_URL}/users", headers=admin_headers)
    assert r.status_code == 200
    body = r.json()
    assert isinstance(body, (list, dict))


def test_usuarios_tienen_campos_esperados(admin_headers):
    r = requests.get(f"{BASE_URL}/users", headers=admin_headers)
    usuarios = r.json() if isinstance(r.json(), list) else r.json().get("data", [])
    if not usuarios:
        return
    u = usuarios[0]
    for campo in ("id", "nombre_completo", "email_institucional", "rol", "estado"):
        assert campo in u, f"Campo '{campo}' faltante en usuario"


def test_crear_usuario_admin(admin_headers):
    payload = {**NUEVO_SOCIO_BASE, "email_institucional": _email_unico()}
    r = requests.post(f"{BASE_URL}/users", json=payload, headers=admin_headers)
    assert r.status_code == 201


def test_crear_usuario_socio_prohibido(socio_headers):
    payload = {**NUEVO_SOCIO_BASE, "email_institucional": _email_unico()}
    r = requests.post(f"{BASE_URL}/users", json=payload, headers=socio_headers)
    assert r.status_code == 403


def test_crear_usuario_sin_auth():
    payload = {**NUEVO_SOCIO_BASE, "email_institucional": _email_unico()}
    r = requests.post(f"{BASE_URL}/users", json=payload)
    assert r.status_code == 401


def test_crear_usuario_email_duplicado(admin_headers):
    email = _email_unico()
    payload = {**NUEVO_SOCIO_BASE, "email_institucional": email}
    requests.post(f"{BASE_URL}/users", json=payload, headers=admin_headers)
    r2 = requests.post(f"{BASE_URL}/users", json=payload, headers=admin_headers)
    assert r2.status_code in (400, 409)


def test_crear_usuario_sin_email(admin_headers):
    r = requests.post(f"{BASE_URL}/users", json=NUEVO_SOCIO_BASE, headers=admin_headers)
    assert r.status_code == 400


def test_editar_usuario_admin(admin_headers):
    email = _email_unico()
    payload = {**NUEVO_SOCIO_BASE, "email_institucional": email}
    r_create = requests.post(f"{BASE_URL}/users", json=payload, headers=admin_headers)
    assert r_create.status_code == 201
    user_id = r_create.json().get("id")
    if not user_id:
        return
    r_edit = requests.put(
        f"{BASE_URL}/users/{user_id}",
        json={"nombre_completo": "Nombre Editado Pytest", "nivel_habilidad": "INTERMEDIO"},
        headers=admin_headers,
    )
    assert r_edit.status_code == 200


def test_editar_usuario_socio_prohibido(socio_headers, admin_headers):
    email = _email_unico()
    payload = {**NUEVO_SOCIO_BASE, "email_institucional": email}
    r_create = requests.post(f"{BASE_URL}/users", json=payload, headers=admin_headers)
    user_id = r_create.json().get("id")
    if not user_id:
        return
    r_edit = requests.put(
        f"{BASE_URL}/users/{user_id}",
        json={"nombre_completo": "Hack Intento"},
        headers=socio_headers,
    )
    assert r_edit.status_code in (403, 401)
