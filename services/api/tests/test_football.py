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


def test_players_and_team_roster_endpoints(client: TestClient) -> None:
    ids = app.state.ids
    with psycopg.connect(os.environ["DATABASE_URL"]) as conn:
        player_id = conn.execute(
            """INSERT INTO players (
                 first_name, last_name, display_name,
                 nationality_code, photo_url, slug
               )
               VALUES (
                 'Bukayo', 'Saka', 'Saka', 'EN',
                 'https://resources.premierleague.com/saka.png', 'bukayo-saka'
               )
               RETURNING id"""
        ).fetchone()[0]
        conn.execute(
            """INSERT INTO squad_memberships (
                 season_id, player_id, team_id, position, positions, squad_number
               )
               VALUES (%s, %s, %s, 'FWD', ARRAY['FWD', 'RW']::TEXT[], 7)""",
            (ids["season"], player_id, ids["home"]),
        )
        conn.commit()

    # List players
    players_res = client.get("/v1/players").json()
    assert players_res["count"] >= 1
    saka = next(p for p in players_res["items"] if p["slug"] == "bukayo-saka")
    assert saka["display_name"] == "Saka"
    assert saka["team_name"] == "Arsenal"
    assert saka["squad_number"] == 7

    # Filter by search q
    search_res = client.get("/v1/players", params={"q": "saka"}).json()
    assert search_res["count"] == 1
    assert search_res["items"][0]["slug"] == "bukayo-saka"

    # Player by slug / id
    player_res = client.get("/v1/players/bukayo-saka").json()
    assert player_res["display_name"] == "Saka"
    assert player_res["team_name"] == "Arsenal"

    # Team roster
    roster_res = client.get(f"/v1/teams/{ids['home']}/roster").json()
    assert roster_res["count"] == 1
    assert roster_res["items"][0]["display_name"] == "Saka"

    with psycopg.connect(os.environ["DATABASE_URL"]) as conn:
        kepa_id = conn.execute(
            """INSERT INTO players (first_name, last_name, display_name, slug)
               VALUES ('Kepa', 'Arrizabalaga', 'Kepa', 'kepa') RETURNING id"""
        ).fetchone()[0]
        raya_id = conn.execute(
            """INSERT INTO players (first_name, last_name, display_name, slug)
               VALUES ('David', 'Raya', 'Raya', 'david-raya') RETURNING id"""
        ).fetchone()[0]
        conn.execute(
            """INSERT INTO squad_memberships (
                 season_id, player_id, team_id, position, positions
               ) VALUES (%s, %s, %s, 'GK', ARRAY['GK']::TEXT[]),
                        (%s, %s, %s, 'GK', ARRAY['GK']::TEXT[])""",
            (ids["season"], kepa_id, ids["home"], ids["season"], raya_id, ids["home"]),
        )
        conn.commit()

    scout_keepers = client.get(
        "/v1/players", params={"position": "GK", "has_stats": True}
    ).json()
    assert [item["slug"] for item in scout_keepers["items"]] == ["david-raya"]
    assert scout_keepers["items"][0]["season_stats"]["provider"] == "scout-csv"
    assert scout_keepers["items"][0]["season_stats"]["stats"]["save_pct"] == 67.5
    all_scout = client.get("/v1/players", params={"has_stats": True}).json()
    assert any(item["slug"] == "david-raya" for item in all_scout["items"])
    raya = client.get("/v1/players/david-raya").json()
    assert raya["season_stats"]["provider"] == "scout-csv"
    assert raya["season_stats"]["stats"]["int_padj"] == 54.5
    all_keepers = client.get("/v1/players", params={"position": "GK"}).json()
    assert {item["slug"] for item in all_keepers["items"]} == {"kepa", "david-raya"}


def test_cb_has_stats_filters_scout_centre_backs(client: TestClient) -> None:
    ids = app.state.ids
    with psycopg.connect(os.environ["DATABASE_URL"]) as conn:
        gabriel_id = conn.execute(
            """INSERT INTO players (first_name, last_name, display_name, slug)
               VALUES ('Gabriel', 'Magalhaes', 'Gabriel', 'gabriel') RETURNING id"""
        ).fetchone()[0]
        other_id = conn.execute(
            """INSERT INTO players (first_name, last_name, display_name, slug)
               VALUES ('Not', 'Listed', 'Random CB', 'random-cb') RETURNING id"""
        ).fetchone()[0]
        conn.execute(
            """INSERT INTO squad_memberships (
                 season_id, player_id, team_id, position, positions
               ) VALUES (%s, %s, %s, 'DEF', ARRAY['CB']::TEXT[]),
                        (%s, %s, %s, 'DEF', ARRAY['CB']::TEXT[])""",
            (ids["season"], gabriel_id, ids["home"], ids["season"], other_id, ids["home"]),
        )
        conn.commit()

    scout_cbs = client.get("/v1/players", params={"position": "CB", "has_stats": True}).json()
    assert [item["slug"] for item in scout_cbs["items"]] == ["gabriel"]
    assert scout_cbs["items"][0]["season_stats"]["provider"] == "scout-csv"
    assert scout_cbs["items"][0]["season_stats"]["stats"]["fwd_pass_pct"] == 47.6


def test_fb_has_stats_filters_scout_fullbacks(client: TestClient) -> None:
    ids = app.state.ids
    with psycopg.connect(os.environ["DATABASE_URL"]) as conn:
        timber_id = conn.execute(
            """INSERT INTO players (first_name, last_name, display_name, slug)
               VALUES ('Jurrien', 'Timber', 'Timber', 'jurrien-timber') RETURNING id"""
        ).fetchone()[0]
        other_id = conn.execute(
            """INSERT INTO players (first_name, last_name, display_name, slug)
               VALUES ('Not', 'Listed', 'Random FB', 'random-fb') RETURNING id"""
        ).fetchone()[0]
        conn.execute(
            """INSERT INTO squad_memberships (
                 season_id, player_id, team_id, position, positions
               ) VALUES (%s, %s, %s, 'DEF', ARRAY['RB']::TEXT[]),
                        (%s, %s, %s, 'DEF', ARRAY['LB']::TEXT[])""",
            (ids["season"], timber_id, ids["home"], ids["season"], other_id, ids["home"]),
        )
        conn.commit()

    scout_fbs = client.get("/v1/players", params={"position": "FB", "has_stats": True}).json()
    assert [item["slug"] for item in scout_fbs["items"]] == ["jurrien-timber"]
    assert scout_fbs["items"][0]["scout_position"] == "RB"
    assert scout_fbs["items"][0]["season_stats"]["provider"] == "scout-csv"
    assert scout_fbs["items"][0]["season_stats"]["stats"]["crosses_cmp"] == 6.5


def test_mid_has_stats_filters_scout_midfielders(client: TestClient) -> None:
    ids = app.state.ids
    with psycopg.connect(os.environ["DATABASE_URL"]) as conn:
        rice_id = conn.execute(
            """INSERT INTO players (first_name, last_name, display_name, slug)
               VALUES ('Declan', 'Rice', 'Rice', 'declan-rice') RETURNING id"""
        ).fetchone()[0]
        other_id = conn.execute(
            """INSERT INTO players (first_name, last_name, display_name, slug)
               VALUES ('Not', 'Listed', 'Random MID', 'random-mid') RETURNING id"""
        ).fetchone()[0]
        conn.execute(
            """INSERT INTO squad_memberships (
                 season_id, player_id, team_id, position, positions
               ) VALUES (%s, %s, %s, 'MID', ARRAY['CM']::TEXT[]),
                        (%s, %s, %s, 'MID', ARRAY['CM']::TEXT[])""",
            (ids["season"], rice_id, ids["home"], ids["season"], other_id, ids["home"]),
        )
        conn.commit()

    scout_mids = client.get("/v1/players", params={"position": "MID", "has_stats": True}).json()
    assert [item["slug"] for item in scout_mids["items"]] == ["declan-rice"]
    assert scout_mids["items"][0]["scout_position"] == "CM"
    assert scout_mids["items"][0]["season_stats"]["provider"] == "scout-csv"
    assert scout_mids["items"][0]["season_stats"]["stats"]["key_passes"] == 74.3


def test_wg_has_stats_filters_scout_wingers(client: TestClient) -> None:
    ids = app.state.ids
    with psycopg.connect(os.environ["DATABASE_URL"]) as conn:
        saka_id = conn.execute(
            """INSERT INTO players (first_name, last_name, display_name, slug)
               VALUES ('Bukayo', 'Saka', 'Saka', 'saka-wg') RETURNING id"""
        ).fetchone()[0]
        other_id = conn.execute(
            """INSERT INTO players (first_name, last_name, display_name, slug)
               VALUES ('Not', 'Listed', 'Random Winger', 'random-wg') RETURNING id"""
        ).fetchone()[0]
        conn.execute(
            """INSERT INTO squad_memberships (
                 season_id, player_id, team_id, position, positions
               ) VALUES (%s, %s, %s, 'FWD', ARRAY['RW']::TEXT[]),
                        (%s, %s, %s, 'FWD', ARRAY['LW']::TEXT[])""",
            (ids["season"], saka_id, ids["home"], ids["season"], other_id, ids["home"]),
        )
        conn.commit()

    scout_wgs = client.get("/v1/players", params={"position": "WG", "has_stats": True}).json()
    assert [item["slug"] for item in scout_wgs["items"]] == ["saka-wg"]
    assert scout_wgs["items"][0]["season_stats"]["provider"] == "scout-csv"
    assert scout_wgs["items"][0]["season_stats"]["stats"]["prog_carries"] == 83.1
    assert scout_wgs["items"][0]["season_stats"]["stats"]["dribbles_cmp"] == 94.1
    assert scout_wgs["items"][0]["scout_position"] == "RW"


