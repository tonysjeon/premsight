from app.providers.openfootball import parse_match_line, parse_openfootball_text

SAMPLE_DATA_V1 = """= English Premier League 2023/24

# Date Fri Aug 11 2023 - Sun May 19 2024 (282d)
# Teams 20
# Matches 380

▪ Matchday 1
Fri Aug 11
  20:00 Burnley FC 0-3 (0-2) Manchester City FC
Sat Aug 12
  13:00 Arsenal FC 2-1 (2-0) Nottingham Forest FC
  15:00 AFC Bournemouth 1-1 (0-0) West Ham United FC
        Brighton & Hove Albion FC 4-1 (1-0) Luton Town FC
"""

SAMPLE_DATA_V2 = """= English Premier League 2024/25

▪ Matchday 1
Fri Aug 16 2024
  20:00 Manchester United FC v Fulham FC 1-0 (0-0)
Sat Aug 17
  12:30 Ipswich Town FC v Liverpool FC 0-2 (0-0)
        Everton FC v Brighton & Hove Albion FC 0-3 (0-1)
"""


def test_parse_openfootball_format_v1():
    season, teams, fixtures = parse_openfootball_text(SAMPLE_DATA_V1, 2023)
    assert season.name == "2023/2024"
    assert len(teams) == 8
    assert len(fixtures) == 4

    burnley_mci = fixtures[0]
    assert burnley_mci.home_score == 0
    assert burnley_mci.away_score == 3
    assert burnley_mci.matchday == 1
    assert burnley_mci.status == "completed"

    brighton = next(t for t in teams if t.tla == "BHA")
    assert brighton.short_name == "Brighton"


def test_parse_openfootball_format_v2():
    season, teams, fixtures = parse_openfootball_text(SAMPLE_DATA_V2, 2024)
    assert season.name == "2024/2025"
    assert len(teams) == 6
    assert len(fixtures) == 3

    mun_ful = fixtures[0]
    assert mun_ful.home_score == 1
    assert mun_ful.away_score == 0
    assert mun_ful.matchday == 1


def test_parse_match_line():
    assert parse_match_line("20:00 Manchester United FC v Fulham FC 1-0 (0-0)") == (
        "20:00",
        "Manchester United FC",
        1,
        0,
        "Fulham FC",
    )
    assert parse_match_line("Everton FC v Brighton & Hove Albion FC 0-3 (0-1)") == (
        None,
        "Everton FC",
        0,
        3,
        "Brighton & Hove Albion FC",
    )
    assert parse_match_line("20:00 Burnley FC 0-3 (0-2) Manchester City FC") == (
        "20:00",
        "Burnley FC",
        0,
        3,
        "Manchester City FC",
    )
