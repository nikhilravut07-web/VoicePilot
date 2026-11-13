from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from voicepilot.database import make_engine
from voicepilot.main import create_app


@pytest.fixture
def client(tmp_path) -> Iterator[TestClient]:
    test_engine = make_engine(f"sqlite:///{tmp_path / 'test.db'}")
    app = create_app(database_engine=test_engine)
    with TestClient(app) as test_client:
        yield test_client
    test_engine.dispose()


def register(client: TestClient, *, email: str, business_name: str = "Business", full_name: str = "Owner") -> tuple[str, str]:
    response = client.post("/api/v1/auth/register", json={
        "business_name": business_name,
        "full_name": full_name,
        "email": email,
        "password": "correct-horse-battery-staple",
    })
    assert response.status_code == 201, response.text
    body = response.json()
    return body["access_token"], body["business"]["id"]


def auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}

