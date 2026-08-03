from __future__ import annotations

from pydantic import BaseModel, ConfigDict

from app.domain.models import HistoricalSnapshot


class Standing(BaseModel):
    model_config = ConfigDict(frozen=True)

    position: int
    team_provider_id: str
    team_name: str
    played: int
    won: int
    drawn: int
    lost: int
    goals_for: int
    goals_against: int
    goal_difference: int
    points: int


class _StandingAccumulator:
    def __init__(self, team_provider_id: str, team_name: str) -> None:
        self.team_provider_id = team_provider_id
        self.team_name = team_name
        self.played = 0
        self.won = 0
        self.drawn = 0
        self.lost = 0
        self.goals_for = 0
        self.goals_against = 0
        self.points = 0

    def record(self, goals_for: int, goals_against: int) -> None:
        self.played += 1
        self.goals_for += goals_for
        self.goals_against += goals_against
        if goals_for > goals_against:
            self.won += 1
            self.points += 3
        elif goals_for == goals_against:
            self.drawn += 1
            self.points += 1
        else:
            self.lost += 1

    @property
    def goal_difference(self) -> int:
        return self.goals_for - self.goals_against


def calculate_standings(snapshot: HistoricalSnapshot) -> tuple[Standing, ...]:
    accumulators = {
        team.provider_id: _StandingAccumulator(team.provider_id, team.name)
        for team in snapshot.teams
    }
    for fixture in snapshot.fixtures:
        if fixture.status != "completed":
            continue
        if fixture.home_score is None or fixture.away_score is None:
            raise ValueError(f"completed fixture {fixture.provider_id} has no final score")
        try:
            home = accumulators[fixture.home_team_provider_id]
            away = accumulators[fixture.away_team_provider_id]
        except KeyError as error:
            raise ValueError(
                f"fixture {fixture.provider_id} references a team outside the snapshot"
            ) from error
        home.record(fixture.home_score, fixture.away_score)
        away.record(fixture.away_score, fixture.home_score)

    ordered = sorted(
        accumulators.values(),
        key=lambda row: (
            -row.points,
            -row.goal_difference,
            -row.goals_for,
            row.team_name.casefold(),
        ),
    )
    return tuple(
        Standing(
            position=position,
            team_provider_id=row.team_provider_id,
            team_name=row.team_name,
            played=row.played,
            won=row.won,
            drawn=row.drawn,
            lost=row.lost,
            goals_for=row.goals_for,
            goals_against=row.goals_against,
            goal_difference=row.goal_difference,
            points=row.points,
        )
        for position, row in enumerate(ordered, start=1)
    )
