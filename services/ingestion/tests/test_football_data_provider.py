import json
from datetime import date

import httpx
import pytest

from app.providers.football_data import FootballDataProvider


def _team(team_id: int, name: str, tla: str, venue: str) -> dict[str, object]:
    return {
        "id": team_id,
        "name": name,
        "shortName": name,
        "tla": tla,
        "venue": venue,
        "crest": f"https://crests.football-data.org/{team_id}.png",
    }


def _responses(match_status: str = "FINISHED") -> dict[str, dict[str, object]]:
    arsenal = _team(57, "Arsenal", "ARS", "Emirates Stadium")
    chelsea = _team(61, "Chelsea", "CHE", "Stamford Bridge")
    match_arsenal = {key: value for key, value in arsenal.items() if key != "venue"}
    match_chelsea = {key: value for key, value in chelsea.items() if key != "venue"}
    return {
        "/v4/competitions/PL/teams": {
            "competition": {
                "id": 2021,
                "code": "PL",
                "name": "Premier League",
                "area": {"code": "ENG"},
            },
            "season": {
                "id": 2403,
                "startDate": "2025-08-15",
                "endDate": "2026-05-24",
            },
            "teams": [arsenal, chelsea],
        },
        "/v4/competitions/PL/matches": {
            "matches": [
                {
                    "id": 537801,
                    "utcDate": "2025-08-16T14:00:00Z",
                    "status": match_status,
                    "matchday": 1,
                    "homeTeam": match_arsenal,
                    "awayTeam": match_chelsea,
                    "score": {"fullTime": {"home": 2, "away": 1}},
                    "goals": [
                        {
                            "minute": 12,
                            "injuryTime": None,
                            "type": "REGULAR",
                            "team": {"id": 57, "name": "Arsenal"},
                            "scorer": {"id": 1, "name": "Bukayo Saka"},
                            "assist": {"id": 2, "name": "Martin Ødegaard"},
                            "score": {"home": 1, "away": 0},
                        },
                        {
                            "minute": 90,
                            "injuryTime": 3,
                            "type": "PENALTY",
                            "team": {"id": 61, "name": "Chelsea"},
                            "scorer": {"id": 3, "name": "Cole Palmer"},
                            "assist": None,
                            "score": {"home": 2, "away": 1},
                        },
                    ],
                    "bookings": [
                        {
                            "minute": 34,
                            "team": {"id": 61, "name": "Chelsea"},
                            "player": {"id": 4, "name": "Moises Caicedo"},
                            "card": "YELLOW",
                        }
                    ],
                    "substitutions": [
                        {
                            "minute": 70,
                            "team": {"id": 57, "name": "Arsenal"},
                            "playerOut": {"id": 5, "name": "Kai Havertz"},
                            "playerIn": {"id": 6, "name": "Gabriel Jesus"},
                        }
                    ],
                }
            ]
        },
    }


def test_provider_normalizes_teams_fixtures_and_results() -> None:
    responses = _responses()
    requested: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requested.append(request)
        return httpx.Response(200, json=responses[request.url.path])

    client = httpx.Client(
        base_url="https://api.football-data.org/v4",
        transport=httpx.MockTransport(handler),
    )
    provider = FootballDataProvider(api_token="secret", client=client)

    snapshot = provider.fetch_season("PL", 2025)

    assert [request.url.params["season"] for request in requested] == ["2025", "2025"]
    assert snapshot.competition.code == "PL"
    assert snapshot.season.name == "2025/2026"
    assert [team.provider_id for team in snapshot.teams] == ["57", "61"]
    assert snapshot.teams[0].crest_url == "https://crests.football-data.org/57.png"
    assert snapshot.fixtures[0].status == "completed"
    assert snapshot.fixtures[0].home_score == 2
    assert snapshot.fixtures[0].venue == "Emirates Stadium"
    assert [event.event_type for event in snapshot.fixtures[0].events] == [
        "goal",
        "card",
        "substitution",
        "goal",
    ]
    assert snapshot.fixtures[0].events[0].player_name == "Bukayo Saka"
    assert snapshot.fixtures[0].events[0].related_player_name == "Martin Ødegaard"
    assert snapshot.fixtures[0].events[1].card_type == "yellow"
    assert snapshot.fixtures[0].events[3].extra_minute == 3
    assert snapshot.fixtures[0].events[3].goal_type == "penalty"
    matches_request = requested[1]
    assert matches_request.headers["x-unfold-goals"] == "true"
    assert matches_request.headers["x-unfold-bookings"] == "true"
    assert matches_request.headers["x-unfold-subs"] == "true"


def test_provider_rejects_unknown_match_status() -> None:
    responses = _responses(match_status="UNKNOWN")

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json=responses[request.url.path])

    client = httpx.Client(
        base_url="https://api.football-data.org/v4",
        transport=httpx.MockTransport(handler),
    )
    provider = FootballDataProvider(api_token="secret", client=client)

    with pytest.raises(ValueError, match="unsupported football-data status"):
        provider.fetch_season("PL", 2025)


def test_provider_retries_rate_limit_response() -> None:
    responses = _responses()
    attempts = 0
    sleeps: list[float] = []

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal attempts
        attempts += 1
        if attempts == 1:
            return httpx.Response(429, headers={"Retry-After": "0"})
        return httpx.Response(200, content=json.dumps(responses[request.url.path]))

    client = httpx.Client(
        base_url="https://api.football-data.org/v4",
        transport=httpx.MockTransport(handler),
    )
    provider = FootballDataProvider(api_token="secret", client=client, sleep=sleeps.append)

    provider.fetch_season("PL", 2025)

    assert attempts == 3
    assert sleeps == [0.0]


def test_provider_fetches_matches_for_a_date_window() -> None:
    responses = _responses()
    requested: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requested.append(request)
        return httpx.Response(200, json=responses[request.url.path])

    client = httpx.Client(
        base_url="https://api.football-data.org/v4",
        transport=httpx.MockTransport(handler),
    )
    provider = FootballDataProvider(api_token="secret", client=client)
    fixtures = provider.fetch_matches("PL", 2025, date(2025, 8, 16), date(2025, 8, 16))

    assert len(requested) == 1
    assert requested[0].url.params["season"] == "2025"
    assert requested[0].url.params["dateFrom"] == "2025-08-16"
    assert requested[0].url.params["dateTo"] == "2025-08-16"
    assert fixtures[0].status == "completed"
    assert fixtures[0].home_score == 2
    assert fixtures[0].venue is None
