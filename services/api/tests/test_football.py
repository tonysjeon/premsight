import os

import psycopg
import pytest
from fastapi.testclient import TestClient
from premsight_database.migrator import migrate_down_all, migrate_up, seed

from app.core.config import get_settings
from app.main import app


@pytest.fixture
def client() -> TestClient:
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        pytest.skip("DATABASE_URL is required for API integration tests")
    migrate_down_all(database_url)
    migrate_up(database_url)
    seed(database_url)
    with psycopg.connect(database_url) as conn:
        competition_id, season_id = conn.execute(
            """SELECT c.id,s.id FROM competitions c JOIN seasons s ON s.competition_id=c.id
               WHERE c.code='PL' AND s.is_current"""
        ).fetchone()
        home_id = conn.execute(
            "INSERT INTO teams(name,short_name,tla) VALUES('Arsenal','Arsenal','ARS') RETURNING id"
        ).fetchone()[0]
        away_id = conn.execute(
            "INSERT INTO teams(name,short_name,tla) VALUES('Chelsea','Chelsea','CHE') RETURNING id"
        ).fetchone()[0]
        fixture_id = conn.execute(
            """INSERT INTO fixtures(competition_id,season_id,home_team_id,away_team_id,
                 status,kickoff_at,matchday,home_score,away_score)
               VALUES(%s,%s,%s,%s,'completed','2026-08-15T14:00:00Z',1,2,1) RETURNING id""",
            (competition_id, season_id, home_id, away_id),
        ).fetchone()[0]
    os.environ["DATABASE_URL"] = database_url
    get_settings.cache_clear()
    app.state.ids = {"season": season_id, "home": home_id, "fixture": fixture_id}
    try:
        yield TestClient(app)
    finally:
        migrate_down_all(database_url)


def test_core_read_endpoints(client: TestClient) -> None:
    ids = app.state.ids
    assert client.get("/v1/seasons/current").status_code == 200
    teams = client.get("/v1/teams", params={"season_id": ids["season"]}).json()
    assert teams["count"] == 2
    fixtures = client.get("/v1/fixtures", params={"status": "completed"}).json()
    assert fixtures["count"] == 1
    assert fixtures["items"][0]["home_team_name"] == "Arsenal"
    assert client.get(f"/v1/fixtures/{ids['fixture']}").json()["home_score"] == 2
    assert len(client.get(f"/v1/teams/{ids['home']}").json()["fixtures"]) == 1
    table = client.get("/v1/standings", params={"season_id": ids["season"]}).json()
    assert [(row["team_name"], row["points"]) for row in table["items"]] == [
        ("Arsenal", 3),
        ("Chelsea", 0),
    ]


def test_validation_and_missing_resources(client: TestClient) -> None:
    assert client.get("/v1/fixtures", params={"status": "unknown"}).status_code == 422
    assert client.get("/v1/fixtures/00000000-0000-0000-0000-000000000000").status_code == 404
