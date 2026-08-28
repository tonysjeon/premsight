from datetime import date

from app.core.config import Settings, scheduler_should_run
from app.services.fixture_refresh import season_start_year_for
from app.services.season_calendar import premier_league_season_start_year


def test_season_year_uses_august_cutoff() -> None:
    assert premier_league_season_start_year(date(2026, 7, 31)) == 2025
    assert premier_league_season_start_year(date(2026, 8, 1)) == 2026
    assert premier_league_season_start_year(date(2027, 1, 1)) == 2026


def test_settings_override_wins_over_calendar() -> None:
    settings = Settings(ingest_season_start_year=2024)
    assert season_start_year_for(settings, today=date(2026, 8, 21)) == 2024


def test_scheduler_requires_token() -> None:
    assert not scheduler_should_run(Settings(schedule_enabled=True, football_data_api_token=""))
    assert scheduler_should_run(
        Settings(schedule_enabled=True, football_data_api_token="token")
    )
    assert not scheduler_should_run(
        Settings(schedule_enabled=False, football_data_api_token="token")
    )
