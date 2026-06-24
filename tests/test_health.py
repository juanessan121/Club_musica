import requests
from tests.conftest import BASE_URL, BASE_URL_NGINX


def test_health_flask_directo():
    r = requests.get(f"{BASE_URL}/health")
    assert r.status_code == 200


def test_health_a_traves_de_nginx():
    r = requests.get(f"{BASE_URL_NGINX}/health")
    assert r.status_code == 200


def test_health_response_fields():
    r = requests.get(f"{BASE_URL}/health")
    body = r.json()
    assert body["status"] == "healthy"
    assert "service" in body
