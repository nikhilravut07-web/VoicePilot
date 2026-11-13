from datetime import datetime, timezone

import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from voicepilot.models import Appointment, CallSession
from tests.conftest import auth, register


def test_registration_hashes_password_and_authenticates(client):
    token, business_id = register(client, email="owner@example.com", business_name="North Clinic")
    assert token
    assert business_id
    assert client.get("/api/v1/business", headers=auth(token)).json()["name"] == "North Clinic"
    login = client.post("/api/v1/auth/login", json={"email": "OWNER@example.com", "password": "correct-horse-battery-staple"})
    assert login.status_code == 200
    assert "password" not in login.json()["user"]
    assert "password_hash" not in login.json()["user"]


def test_login_rejects_unknown_user_and_wrong_password(client):
    register(client, email="owner@example.com")
    for credentials in [
        {"email": "owner@example.com", "password": "wrong-password"},
        {"email": "missing@example.com", "password": "wrong-password"},
    ]:
        response = client.post("/api/v1/auth/login", json=credentials)
        assert response.status_code == 401
        assert response.json()["detail"] == "Invalid email or password"


def test_registration_rejects_short_password_and_duplicate_email(client):
    payload = {"business_name": "One", "full_name": "Owner", "email": "owner@example.com", "password": "short"}
    assert client.post("/api/v1/auth/register", json=payload).status_code == 422
    register(client, email="owner@example.com")
    duplicate = client.post("/api/v1/auth/register", json={**payload, "password": "correct-horse-battery-staple"})
    assert duplicate.status_code == 409


def test_authentication_required(client):
    assert client.get("/api/v1/business").status_code == 401
    assert client.get("/api/v1/business", headers=auth("invalid-token")).status_code == 401


def test_tenant_scoping_hides_services_calls_and_profile(client):
    token_a, business_a = register(client, email="a@example.com", business_name="Business A")
    token_b, business_b = register(client, email="b@example.com", business_name="Business B")
    service = client.post("/api/v1/services", headers=auth(token_a), json={"name": "Consultation", "duration_minutes": 30}).json()
    assert service["business_id"] == business_a
    assert client.get("/api/v1/services", headers=auth(token_b)).json() == []
    assert client.patch(f"/api/v1/services/{service['id']}", headers=auth(token_b), json={"name": "Hijack"}).status_code == 404
    assert client.get("/api/v1/calls/not-a-call", headers=auth(token_b)).status_code == 404
    profile_b = client.get("/api/v1/business", headers=auth(token_b)).json()
    assert profile_b["id"] == business_b
    assert profile_b["id"] != business_a


def test_call_records_are_visible_only_to_their_business(client):
    token_a, business_a = register(client, email="a@example.com")
    token_b, _ = register(client, email="b@example.com")
    with Session(client.app.state.database_engine) as db:
        call = CallSession(business_id=business_a, started_at=datetime.now(timezone.utc), status="completed", summary="Test record")
        db.add(call)
        db.commit()
        call_id = call.id
    assert client.get(f"/api/v1/calls/{call_id}", headers=auth(token_a)).status_code == 200
    assert client.get(f"/api/v1/calls/{call_id}", headers=auth(token_b)).status_code == 404


def test_cross_tenant_appointment_references_are_rejected(client):
    token_a, business_a = register(client, email="a@example.com")
    token_b, business_b = register(client, email="b@example.com")
    service = client.post("/api/v1/services", headers=auth(token_a), json={"name": "Only A"}).json()
    response = client.post("/api/v1/appointments", headers=auth(token_b), json={
        "service_id": service["id"],
        "customer_name": "Customer",
        "starts_at": "2026-12-01T09:00:00+05:30",
        "ends_at": "2026-12-01T09:30:00+05:30",
    })
    assert response.status_code == 404
    assert response.json()["detail"] == "Service not found"
    with Session(client.app.state.database_engine) as db, pytest.raises(IntegrityError):
        db.add(Appointment(
            business_id=business_b,
            service_id=service["id"],
            customer_name="Cross-tenant reference",
            starts_at=datetime(2026, 12, 1, 9, tzinfo=timezone.utc),
            ends_at=datetime(2026, 12, 1, 9, 30, tzinfo=timezone.utc),
        ))
        db.commit()

