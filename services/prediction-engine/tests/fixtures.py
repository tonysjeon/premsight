from app.domain.models import MatchResult


def balanced_history() -> list[MatchResult]:
    return [
        MatchResult(home_team_id="A", away_team_id="B", home_score=2, away_score=1),
        MatchResult(home_team_id="B", away_team_id="A", home_score=1, away_score=1),
        MatchResult(home_team_id="A", away_team_id="C", home_score=1, away_score=0),
        MatchResult(home_team_id="C", away_team_id="A", home_score=1, away_score=2),
        MatchResult(home_team_id="B", away_team_id="C", home_score=2, away_score=1),
        MatchResult(home_team_id="C", away_team_id="B", home_score=1, away_score=1),
    ]


def symmetric_history() -> list[MatchResult]:
    return [
        MatchResult(home_team_id=home, away_team_id=away, home_score=1, away_score=1)
        for home, away in (("A", "B"), ("B", "A"), ("A", "C"), ("C", "A"))
    ]
