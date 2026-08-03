from datetime import UTC, datetime

import pytest

from app.domain.models import ProviderFixture
from app.domain.standings import calculate_standings
from tests.snapshots import historical_snapshot


def test_standings_are_generated_from_completed_results() -> None:
    snapshot = historical_snapshot()
    scheduled_reverse_fixture = ProviderFixture(
        provider_id="fixture-2",
        home_team_provider_id="team-2",
        away_team_provider_id="team-1",
        status="scheduled",
        kickoff_at=datetime(2026, 2, 1, 14, 0, tzinfo=UTC),
    )
    snapshot = snapshot.model_copy(
        update={"fixtures": (*snapshot.fixtures, scheduled_reverse_fixture)}
    )

    standings = calculate_standings(snapshot)

    assert [row.team_name for row in standings] == ["Arsenal", "Chelsea"]
    assert standings[0].model_dump() == {
        "position": 1,
        "team_provider_id": "team-1",
        "team_name": "Arsenal",
        "played": 1,
        "won": 1,
        "drawn": 0,
        "lost": 0,
        "goals_for": 2,
        "goals_against": 1,
        "goal_difference": 1,
        "points": 3,
    }
    assert standings[1].points == 0
    assert standings[1].lost == 1


def test_completed_fixture_without_score_is_rejected() -> None:
    snapshot = historical_snapshot()
    invalid = snapshot.fixtures[0].model_copy(update={"home_score": None})
    snapshot = snapshot.model_copy(update={"fixtures": (invalid,)})

    with pytest.raises(ValueError, match="has no final score"):
        calculate_standings(snapshot)


def test_empty_table_has_deterministic_team_name_order() -> None:
    snapshot = historical_snapshot().model_copy(update={"fixtures": ()})

    standings = calculate_standings(snapshot)

    assert [(row.position, row.team_name) for row in standings] == [
        (1, "Arsenal"),
        (2, "Chelsea"),
    ]
