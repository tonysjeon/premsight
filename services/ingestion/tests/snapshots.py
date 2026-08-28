from datetime import UTC, date, datetime

from app.domain.models import (
    HistoricalSnapshot,
    ProviderCompetition,
    ProviderFixture,
    ProviderMatchEvent,
    ProviderSeason,
    ProviderTeam,
)


def historical_snapshot() -> HistoricalSnapshot:
    return HistoricalSnapshot(
        provider="test-provider",
        competition=ProviderCompetition(
            provider_id="comp-1",
            code="PL",
            name="Premier League",
            country_code="ENG",
        ),
        season=ProviderSeason(
            provider_id="season-1",
            name="2025/2026",
            start_date=date(2025, 8, 15),
            end_date=date(2026, 5, 24),
        ),
        teams=(
            ProviderTeam(provider_id="team-1", name="Arsenal", short_name="Arsenal", tla="ARS"),
            ProviderTeam(provider_id="team-2", name="Chelsea", short_name="Chelsea", tla="CHE"),
        ),
        fixtures=(
            ProviderFixture(
                provider_id="fixture-1",
                home_team_provider_id="team-1",
                away_team_provider_id="team-2",
                status="completed",
                kickoff_at=datetime(2025, 8, 16, 14, 0, tzinfo=UTC),
                matchday=1,
                home_score=2,
                away_score=1,
                venue="Emirates Stadium",
                events=(
                    ProviderMatchEvent(
                        event_type="goal",
                        minute=12,
                        period="1H",
                        team_provider_id="team-1",
                        player_name="Bukayo Saka",
                        related_player_name="Martin Odegaard",
                        goal_type="regular",
                        home_score=1,
                        away_score=0,
                    ),
                    ProviderMatchEvent(
                        event_type="card",
                        minute=34,
                        period="1H",
                        team_provider_id="team-2",
                        player_name="Moises Caicedo",
                        card_type="yellow",
                    ),
                ),
            ),
        ),
    )
