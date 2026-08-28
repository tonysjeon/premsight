from datetime import UTC, date, datetime

PREMIER_LEAGUE_SEASON_START_MONTH = 8


def premier_league_season_start_year(today: date | None = None) -> int:
    """Return the UTC Premier League season start year for a calendar date."""
    day = today or datetime.now(UTC).date()
    if day.month >= PREMIER_LEAGUE_SEASON_START_MONTH:
        return day.year
    return day.year - 1
