from tests.conftest import auth, register


def test_appointments_require_offsets_start_pending_and_keep_tenant_scope(client):
    token_a, _ = register(client, email="a@example.com")
    token_b, _ = register(client, email="b@example.com")
    service = client.post("/api/v1/services", headers=auth(token_a), json={"name": "Consultation"}).json()

    missing_offset = client.post("/api/v1/appointments", headers=auth(token_a), json={
        "customer_name": "A Customer",
        "starts_at": "2026-12-01T09:00:00",
        "ends_at": "2026-12-01T09:30:00",
    })
    assert missing_offset.status_code == 422

    created = client.post("/api/v1/appointments", headers=auth(token_a), json={
        "service_id": service["id"],
        "customer_name": "A Customer",
        "starts_at": "2026-12-01T09:00:00+05:30",
        "ends_at": "2026-12-01T09:30:00+05:30",
    })
    assert created.status_code == 201, created.text
    appointment = created.json()
    assert appointment["status"] == "pending"
    assert appointment["business_id"] != ""
    assert appointment["starts_at"].endswith(("+00:00", "Z"))
    assert client.get("/api/v1/appointments", headers=auth(token_b)).json() == []
    assert client.patch(f"/api/v1/appointments/{appointment['id']}", headers=auth(token_b), json={"status": "cancelled"}).status_code == 404


def test_appointment_does_not_claim_calendar_confirmation(client):
    token, _ = register(client, email="owner@example.com")
    response = client.post("/api/v1/appointments", headers=auth(token), json={
        "customer_name": "A Customer",
        "starts_at": "2026-12-01T09:00:00Z",
        "ends_at": "2026-12-01T09:30:00Z",
    })
    assert response.status_code == 201
    appointment_id = response.json()["id"]
    assert response.json()["status"] == "pending"
    assert client.patch(f"/api/v1/appointments/{appointment_id}", headers=auth(token), json={"status": "confirmed"}).status_code == 422


def test_empty_and_filtered_call_history(client):
    token, _ = register(client, email="owner@example.com")
    assert client.get("/api/v1/calls", headers=auth(token)).json() == []
    assert client.get("/api/v1/calls?status=completed&limit=5", headers=auth(token)).json() == []

