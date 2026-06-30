import requests
from tests.conftest import BASE_URL, ADMIN_EMAIL, SOCIO_EMAIL, PASSWORD

# Email usado solo para tests de logout — nunca como fixture de sesión
# para evitar invalidar el socio_token (JWTs son deterministas por segundo)
LOGOUT_TEST_EMAIL = "javier.herrada@pucesa.edu.ec"


def test_login_admin_exitoso():
    r = requests.post(f"{BASE_URL}/auth/login", json={"email": ADMIN_EMAIL, "password": PASSWORD})
    assert r.status_code == 200
    body = r.json()
    assert "token" in body
    assert body["is_admin"] is True
    assert "user" in body


def test_login_socio_exitoso():
    r = requests.post(f"{BASE_URL}/auth/login", json={"email": SOCIO_EMAIL, "password": PASSWORD})
    assert r.status_code == 200
    body = r.json()
    assert "token" in body
    assert body["is_admin"] is False


def test_login_contrasena_incorrecta():
    r = requests.post(f"{BASE_URL}/auth/login", json={"email": ADMIN_EMAIL, "password": "WrongPass123!"})
    assert r.status_code == 401


def test_login_email_inexistente():
    r = requests.post(f"{BASE_URL}/auth/login", json={"email": "noexiste@pucesa.edu.ec", "password": PASSWORD})
    assert r.status_code in (401, 404)


def test_login_sin_email():
    r = requests.post(f"{BASE_URL}/auth/login", json={"password": PASSWORD})
    assert r.status_code in (400, 422)


def test_login_sin_password_rechaza():
    # La contraseña es requerida; omitirla debe devolver 400.
    r = requests.post(f"{BASE_URL}/auth/login", json={"email": ADMIN_EMAIL})
    assert r.status_code == 400


def test_login_body_vacio():
    r = requests.post(f"{BASE_URL}/auth/login", json={})
    assert r.status_code in (400, 422)


def test_endpoint_protegido_sin_token():
    r = requests.get(f"{BASE_URL}/dashboard/stats")
    assert r.status_code == 401


def test_endpoint_protegido_token_invalido():
    r = requests.get(f"{BASE_URL}/dashboard/stats", headers={"Authorization": "Bearer token.falso.123"})
    assert r.status_code == 401


def test_logout_con_token_valido():
    # Usa LOGOUT_TEST_EMAIL (tercer socio) para no contaminar la fixture socio_token
    r_login = requests.post(f"{BASE_URL}/auth/login", json={"email": LOGOUT_TEST_EMAIL, "password": PASSWORD})
    assert r_login.status_code == 200
    tmp_token = r_login.json()["token"]
    r = requests.post(f"{BASE_URL}/auth/logout", headers={"Authorization": f"Bearer {tmp_token}"})
    assert r.status_code == 200


def test_logout_sin_token():
    r = requests.post(f"{BASE_URL}/auth/logout")
    assert r.status_code == 401


def test_token_invalido_tras_logout():
    r_login = requests.post(f"{BASE_URL}/auth/login", json={"email": LOGOUT_TEST_EMAIL, "password": PASSWORD})
    tmp_token = r_login.json()["token"]
    requests.post(f"{BASE_URL}/auth/logout", headers={"Authorization": f"Bearer {tmp_token}"})
    r = requests.get(f"{BASE_URL}/dashboard/stats", headers={"Authorization": f"Bearer {tmp_token}"})
    assert r.status_code == 401
