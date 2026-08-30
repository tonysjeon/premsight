import os
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from premsight_database.migrator import migrate_down_all, migrate_up
from psycopg.conninfo import conninfo_to_dict

from app.clients.oauth import OAuthProfile, encode_oauth_state
from app.core.config import get_settings
from app.main import app


def _require_disposable_database(database_url: str) -> None:
    database_name = conninfo_to_dict(database_url).get("dbname", "")
    if not database_name.endswith("_test"):
        pytest.fail("API integration tests require a database name ending in '_test'")


@pytest.fixture
def client() -> TestClient:
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        pytest.skip("DATABASE_URL is required for API integration tests")
    _require_disposable_database(database_url)
    migrate_down_all(database_url)
    migrate_up(database_url)
    os.environ["DATABASE_URL"] = database_url
    os.environ["GOOGLE_OAUTH_CLIENT_ID"] = "google-client"
    os.environ["GOOGLE_OAUTH_CLIENT_SECRET"] = "google-secret"
    get_settings.cache_clear()
    try:
        yield TestClient(app)
    finally:
        get_settings.cache_clear()
        migrate_down_all(database_url)


def test_providers_configured(client: TestClient) -> None:
    payload = client.get("/v1/auth/providers").json()
    assert payload == {"google": True}


def test_google_start_redirects_to_google(client: TestClient) -> None:
    response = client.get(
        "/v1/auth/google/start",
        params={"return_to": "http://localhost:3000/table"},
        follow_redirects=False,
    )
    assert response.status_code == 302
    location = response.headers["location"]
    assert location.startswith("https://accounts.google.com/o/oauth2/v2/auth")
    assert "client_id=google-client" in location


def test_google_callback_sets_session(client: TestClient) -> None:
    state = encode_oauth_state("google", "http://localhost:3000/")
    profile = OAuthProfile(
        "google",
        "google-sub",
        "fan@example.com",
        "Fan",
        "https://lh3.googleusercontent.com/a/photo",
    )
    with patch("app.api.routes.auth.exchange_code", return_value=profile):
        response = client.get(
            "/v1/auth/google/callback",
            params={"code": "ok", "state": state},
            follow_redirects=False,
        )
    assert response.status_code == 302
    assert response.headers["location"] == "http://localhost:3000/?signed_in=1"
    me = client.get("/v1/auth/me")
    assert me.status_code == 200
    payload = me.json()
    assert payload["email"] == "fan@example.com"
    assert payload["avatar_url"] == "https://lh3.googleusercontent.com/a/photo"
    assert payload["provider"] == "google"
    assert payload["provider_user_id"] == "google-sub"
    assert client.post("/v1/auth/logout").status_code == 204
    assert client.get("/v1/auth/me").status_code == 401


def test_delete_account_removes_user(client: TestClient) -> None:
    state = encode_oauth_state("google", "http://localhost:3000/")
    profile = OAuthProfile("google", "google-sub", "fan@example.com", "Fan")
    with patch("app.api.routes.auth.exchange_code", return_value=profile):
        client.get(
            "/v1/auth/google/callback",
            params={"code": "ok", "state": state},
            follow_redirects=False,
        )
    assert client.delete("/v1/auth/me").status_code == 204
    assert client.get("/v1/auth/me").status_code == 401
