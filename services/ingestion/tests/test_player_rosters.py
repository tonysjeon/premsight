import os
from datetime import UTC, datetime

import psycopg
import pytest
from premsight_database.migrator import migrate_down_all, migrate_up, seed
from psycopg.conninfo import conninfo_to_dict

from app.domain.models import PlayerCatalog, ProviderPlayer, ProviderPlayerTeam
from app.repositories.players import PostgresPlayerRosterRepository, slugify


def _require_disposable_database(database_url: str) -> None:
    database_name = conninfo_to_dict(database_url).get("dbname", "")
    if not database_name.endswith("_test"):
        pytest.fail("Ingestion integration tests require a database name ending in '_test'")


@pytest.fixture
def database_url() -> str:
    url = os.environ.get("DATABASE_URL")
    if not url:
        pytest.skip("DATABASE_URL is required for repository integration tests")
    _require_disposable_database(url)
    migrate_down_all(url)
    migrate_up(url)
    seed(url)
    try:
        yield url
    finally:
        migrate_down_all(url)


def test_slugify_normalizes_names() -> None:
    assert slugify("Martin Ødegaard") == "martin-odegaard"
    assert slugify("Heung-min Son") == "heung-min-son"
    assert slugify("Erling Haaland") == "erling-haaland"


def test_sync_players_persists_players_and_memberships(database_url: str) -> None:
    with psycopg.connect(database_url) as conn:
        conn.execute(
            """INSERT INTO teams (name, short_name, tla)
               VALUES ('Arsenal', 'Arsenal', 'ARS'), ('Chelsea', 'Chelsea', 'CHE')"""
        )
        conn.commit()

    catalog = PlayerCatalog(
        provider="fpl",
        captured_at=datetime.now(UTC),
        teams=(
            ProviderPlayerTeam(provider_id="1", name="Arsenal", tla="ARS"),
            ProviderPlayerTeam(provider_id="2", name="Chelsea", tla="CHE"),
        ),
        players=(
            ProviderPlayer(
                provider_id="101",
                team_provider_id="1",
                first_name="Bukayo",
                last_name="Saka",
                display_name="Saka",
                position="FWD",
                positions=("FWD", "RW"),
                nationality_code="EN",
                photo_url="https://resources.premierleague.com/premierleague/photos/players/250x250/p223340.png",
                can_select=True,
                availability=100,
                minutes=900,
                starts=10,
                total_points=65,
                ownership=42.5,
                price=100,
                squad_number=7,
            ),
            ProviderPlayer(
                provider_id="102",
                team_provider_id="2",
                first_name="Cole",
                last_name="Palmer",
                display_name="Palmer",
                position="MID",
                positions=("MID", "CAM"),
                nationality_code="EN",
                photo_url="https://resources.premierleague.com/premierleague/photos/players/250x250/p468002.png",
                can_select=True,
                availability=100,
                minutes=850,
                starts=9,
                total_points=70,
                ownership=48.0,
                price=105,
                squad_number=20,
            ),
        ),
    )

    repo = PostgresPlayerRosterRepository(database_url)
    res1 = repo.sync_players(catalog)
    assert res1.players_processed == 2

    # Verify database state
    with psycopg.connect(database_url) as conn:
        players = conn.execute(
            "SELECT display_name, slug, nationality_code FROM players ORDER BY display_name"
        ).fetchall()
        assert len(players) == 2
        assert players[0][0] == "Palmer"
        assert players[1][0] == "Saka"

        memberships = conn.execute(
            """SELECT p.display_name, t.tla, sm.position, sm.positions, sm.squad_number
               FROM squad_memberships sm
               JOIN players p ON p.id = sm.player_id
               JOIN teams t ON t.id = sm.team_id
               ORDER BY p.display_name"""
        ).fetchall()
        assert len(memberships) == 2
        assert memberships[0] == ("Palmer", "CHE", "MID", ["MID", "CAM"], 20)
        assert memberships[1] == ("Saka", "ARS", "FWD", ["FWD", "RW"], 7)

    # Replay must be idempotent
    res2 = repo.sync_players(catalog)
    assert res2.players_processed == 2

    with psycopg.connect(database_url) as conn:
        count = conn.execute("SELECT count(*) FROM players").fetchone()[0]
        assert count == 2
