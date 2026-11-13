from tests.conftest import auth, register


def test_business_and_receptionist_config_updates_are_scoped(client):
    token, _ = register(client, email="owner@example.com")
    updated = client.patch("/api/v1/business", headers=auth(token), json={"timezone": "Asia/Kolkata", "operating_hours": {"monday": {"open": "09:00", "close": "17:00"}}})
    assert updated.status_code == 200
    assert updated.json()["timezone"] == "Asia/Kolkata"
    config = client.patch("/api/v1/receptionist-config", headers=auth(token), json={"greeting": "Welcome", "faqs": [{"question": "Hours?", "answer": "Nine to five"}]})
    assert config.status_code == 200
    assert config.json()["greeting"] == "Welcome"
    assert len(config.json()["faqs"]) == 1


def test_service_validation_and_crud(client):
    token, _ = register(client, email="owner@example.com")
    assert client.post("/api/v1/services", headers=auth(token), json={"name": "Bad", "duration_minutes": 0}).status_code == 422
    created = client.post("/api/v1/services", headers=auth(token), json={"name": "Consultation", "duration_minutes": 45, "price_minor": 2500})
    assert created.status_code == 201
    service_id = created.json()["id"]
    assert client.patch(f"/api/v1/services/{service_id}", headers=auth(token), json={"is_active": False}).json()["is_active"] is False
    assert client.delete(f"/api/v1/services/{service_id}", headers=auth(token)).status_code == 204
    assert client.patch(f"/api/v1/services/{service_id}", headers=auth(token), json={"name": "missing"}).status_code == 404


def test_calendar_integration_is_a_disconnected_placeholder(client):
    token, _ = register(client, email="owner@example.com")
    response = client.get("/api/v1/integrations/google-calendar", headers=auth(token))
    assert response.status_code == 200
    body = response.json()
    assert body["provider"] == "google_calendar"
    assert body["status"] == "disconnected"
    assert body["external_account"] is None
    assert "oauth" not in body
    assert client.get("/api/v1/integrations", headers=auth(token)).json() == [body]


def test_swagger_and_health_are_available(client):
    assert client.get("/healthz").json() == {"status": "ok"}
    assert client.get("/docs").status_code == 200
    schema = client.get("/openapi.json").json()
    assert "/api/v1/auth/register" in schema["paths"]

