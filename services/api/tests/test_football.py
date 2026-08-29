import os

import psycopg
import pytest
from fastapi.testclient import TestClient
from premsight_database.migrator import migrate_down_all, migrate_up, seed
from psycopg.conninfo import conninfo_to_dict

from app.api.routes.football import prediction_client
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
        conn.execute(
            """INSERT INTO match_events(
                 fixture_id,event_type,minute,period,team_id,player_name,
                 related_player_name,detail,sort_key)
               VALUES(%s,'goal',12,'1H',%s,'Bukayo Saka','Martin Odegaard',
                      '{"goal_type":"regular"}'::jsonb,0)""",
            (fixture_id, home_id),
        )
        snapshot_id = conn.execute(
            """INSERT INTO player_snapshot_runs(season_id,provider,captured_at)
               VALUES(%s,'fpl','2026-08-04T12:00:00Z') RETURNING id""",
            (season_id,),
        ).fetchone()[0]
        conn.execute(
            """INSERT INTO player_snapshot_entries(
                 snapshot_id,team_id,provider_player_id,first_name,last_name,
                 display_name,position,positions,nationality_code,photo_url,club_rank,global_rank,
                 ea_rating,rating_model_version)
               VALUES(%s,%s,'1','David','Raya','Raya','GK',ARRAY['GK'],'ES',
                      'https://resources.premierleague.com/raya.png',1,1,85,'ea-fc-v1')""",
            (snapshot_id, home_id),
        )
        conn.execute(
            """INSERT INTO player_snapshot_entries(
                 snapshot_id,team_id,provider_player_id,first_name,last_name,
                 display_name,position,positions,club_rank,global_rank)
               VALUES(%s,%s,'2','Unknown','Defender','Unknown Defender','DEF',ARRAY['DEF'],2,2)""",
            (snapshot_id, home_id),
        )
    os.environ["DATABASE_URL"] = database_url
    get_settings.cache_clear()
    app.state.ids = {
        "competition": competition_id,
        "season": season_id,
        "home": home_id,
        "away": away_id,
        "fixture": fixture_id,
    }
    try:
        yield TestClient(app)
    finally:
        migrate_down_all(database_url)


def test_core_read_endpoints(client: TestClient) -> None:
    ids = app.state.ids
    assert client.get("/v1/seasons/current").status_code == 200
    seasons = client.get("/v1/seasons").json()
    assert seasons["count"] == 1
    assert seasons["items"][0]["id"] == str(ids["season"])
    assert seasons["items"][0]["slug"] == "2026-27"
    teams = client.get("/v1/teams", params={"season_id": "2026-27"}).json()
    assert {team["slug"] for team in teams["items"]} == {"ars", "che"}
    assert client.get("/v1/teams/ars").status_code == 200
    assert teams["count"] == 2
    fixtures = client.get("/v1/fixtures", params={"status": "completed"}).json()
    assert fixtures["count"] == 1
    assert fixtures["items"][0]["home_team_name"] == "Arsenal"
    match = client.get(f"/v1/fixtures/{ids['fixture']}").json()
    assert match["home_score"] == 2
    assert match["events"][0]["player_name"] == "Bukayo Saka"
    assert match["events"][0]["minute"] == 12
    assert "events" not in fixtures["items"][0]
    assert len(client.get(f"/v1/teams/{ids['home']}").json()["fixtures"]) == 1
    table = client.get("/v1/standings", params={"season_id": "2026-27"}).json()
    assert [(row["team_name"], row["points"]) for row in table["items"]] == [
        ("Arsenal", 3),
        ("Chelsea", 0),
    ]
    snapshot = client.get("/v1/player-snapshots/latest").json()
    assert snapshot["count"] == 1
    assert [player["display_name"] for player in snapshot["players"]] == ["Raya"]
    assert snapshot["players"][0]["display_name"] == "Raya"
    assert snapshot["players"][0]["global_rank"] == 1
    assert snapshot["players"][0]["positions"] == ["GK"]
    assert snapshot["players"][0]["ea_rating"] == 85
    assert snapshot["players"][0]["rating_model_version"] == "ea-fc-v1"
    assert snapshot["players"][0]["nationality_code"] == "ES"
    assert snapshot["players"][0]["photo_url"].endswith("/raya.png")


def test_validation_and_missing_resources(client: TestClient) -> None:
    assert client.get("/v1/fixtures", params={"status": "unknown"}).status_code == 422
    assert client.get("/v1/fixtures/00000000-0000-0000-0000-000000000000").status_code == 404


def test_preseason_standings_include_scheduled_teams(client: TestClient) -> None:
    ids = app.state.ids
    with psycopg.connect(os.environ["DATABASE_URL"]) as conn:
        season_id = conn.execute(
            """INSERT INTO seasons(competition_id,name,start_date,end_date,is_current)
               VALUES(%s,'2027/2028','2027-08-01','2028-05-31',false) RETURNING id""",
            (ids["competition"],),
        ).fetchone()[0]
        conn.execute(
            """INSERT INTO fixtures(competition_id,season_id,home_team_id,away_team_id,
                 status,kickoff_at,matchday)
               VALUES(%s,%s,%s,%s,'scheduled','2027-08-14T14:00:00Z',1)""",
            (ids["competition"], season_id, ids["home"], ids["away"]),
        )

    table = client.get("/v1/standings", params={"season_id": season_id}).json()
    assert table["count"] == 2
    assert [(row["team_name"], row["played"], row["points"]) for row in table["items"]] == [
        ("Arsenal", 0, 0),
        ("Chelsea", 0, 0),
    ]


def test_fixture_prediction_coordinates_history(client: TestClient) -> None:
    calls: list[tuple[str, str, list[dict]]] = []
    ids = app.state.ids
    with psycopg.connect(os.environ["DATABASE_URL"]) as conn:
        conn.execute(
            """INSERT INTO fixtures(competition_id,season_id,home_team_id,away_team_id,
                 status,kickoff_at,matchday,home_score,away_score)
               VALUES(%s,%s,%s,%s,'completed','2026-08-01T14:00:00Z',1,1,1)""",
            (ids["competition"], ids["season"], ids["away"], ids["home"]),
        )

    class FakePredictionClient:
        def predict(self, home_team_id: str, away_team_id: str, results: list[dict]) -> dict:
            calls.append((home_team_id, away_team_id, results))
            return {
                "model_version": "poisson-v1",
                "outcomes": {"home_win": 0.5, "draw": 0.25, "away_win": 0.25},
            }

    app.dependency_overrides[prediction_client] = FakePredictionClient
    try:
        response = client.get(f"/v1/fixtures/{ids['fixture']}/prediction")
    finally:
        app.dependency_overrides.pop(prediction_client, None)

    assert response.status_code == 200
    assert response.json()["model_version"] == "poisson-v1"
    assert len(calls) == 1
    assert len(calls[0][2]) == 1
