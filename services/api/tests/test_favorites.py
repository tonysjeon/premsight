import os
from uuid import uuid4

import psycopg
import pytest
from fastapi.testclient import TestClient
from premsight_database.migrator import migrate_up
from psycopg.conninfo import conninfo_to_dict

from app.core.config import get_settings
from app.core.security import create_session_token
from app.main import app


@pytest.mark.parametrize("kind", ["players", "teams"])
def test_favorites_persist_and_are_private(kind: str) -> None:
    url = os.environ.get("DATABASE_URL")
    if not url:
        pytest.skip("DATABASE_URL required")
    assert conninfo_to_dict(url)["dbname"].endswith("_test")
    migrate_up(url)
    get_settings.cache_clear()
    with psycopg.connect(url) as conn:
        user_ids = [conn.execute(
            "INSERT INTO users(email, display_name) VALUES (%s, 'Test') RETURNING id",
            (f"{uuid4()}@example.com",),
        ).fetchone()[0] for _ in range(2)]
        query = (
            "INSERT INTO players(first_name,last_name,display_name) "
            "VALUES ('Test','Player','Test Player') RETURNING id"
            if kind == "players" else "INSERT INTO teams(name) VALUES ('Test Team') RETURNING id"
        )
        player = conn.execute(query).fetchone()[0]
    base = f"/v1/favorites/{kind}"
    path = f"{base}/{player}"
    client = TestClient(app)
    try:
        assert client.put(path).status_code == 401
        client.cookies.set(get_settings().auth_cookie_name, create_session_token(user_ids[0]))
        assert client.put(path).status_code == 204
        assert client.put(path).status_code == 204
        assert client.get(base).json()['count'] == 1
        assert client.put(f'{base}/{uuid4()}').status_code == 404
        client.cookies.set(get_settings().auth_cookie_name, create_session_token(user_ids[1]))
        assert client.get(base).json()['count'] == 0
        assert client.delete(path).status_code == 204
        client.cookies.set(get_settings().auth_cookie_name, create_session_token(user_ids[0]))
        assert client.get(base).json()['count'] == 1
        assert client.delete(path).status_code == 204
        assert client.get(base).json()['count'] == 0
        assert client.put(path).status_code == 204
        assert client.delete('/v1/auth/me').status_code == 204
        with psycopg.connect(url) as conn:
            query = ('SELECT count(*) FROM player_favorites WHERE user_id=%s'
                     if kind == 'players' else
                     'SELECT count(*) FROM team_favorites WHERE user_id=%s')
            assert conn.execute(query,
                                (user_ids[0],)).fetchone()[0] == 0
    finally:
        with psycopg.connect(url) as conn:
            conn.execute('DELETE FROM users WHERE id=ANY(%s)', (user_ids,))
            query = ('DELETE FROM players WHERE id=%s' if kind == 'players'
                     else 'DELETE FROM teams WHERE id=%s')
            conn.execute(query, (player,))
        get_settings.cache_clear()
