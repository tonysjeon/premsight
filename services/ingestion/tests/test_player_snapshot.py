from datetime import UTC, datetime

import pytest

from app.domain.models import PlayerCatalog, ProviderPlayer, ProviderPlayerTeam
from app.repositories.player_snapshots import internal_team_tla
from app.services.player_snapshot import RATING_MODEL_VERSION, select_player_snapshot

POSITION_GROUP = {
    "GK": "GK",
    "LB": "DEF",
    "CB": "DEF",
    "RB": "DEF",
    "CDM": "MID",
    "CM": "MID",
    "CAM": "MID",
    "LM": "MID",
    "RM": "MID",
    "LW": "FWD",
    "RW": "FWD",
    "ST": "FWD",
}


def player(
    provider_id: int,
    position: str,
    *,
    ea_rating: int = 80,
    points: int = 0,
    minutes: int = 0,
    can_select: bool = True,
) -> ProviderPlayer:
    return ProviderPlayer(
        provider_id=str(provider_id),
        team_provider_id="1",
        first_name="Player",
        last_name=str(provider_id),
        display_name=f"Player {provider_id}",
        position=POSITION_GROUP[position],
        positions=(position,),
        nationality_code="EN",
        photo_url="https://resources.premierleague.com/player.png",
        can_select=can_select,
        availability=100,
        minutes=minutes,
        starts=minutes // 90,
        total_points=points,
        ownership=0,
        price=50,
        ea_rating=ea_rating,
    )


def valid_players() -> tuple[ProviderPlayer, ...]:
    roles = ("GK", "LB", "CB", "CB", "RB", "CM", "CDM", "CM", "LW", "ST", "RW")
    return tuple(player(index, role, ea_rating=70 + index) for index, role in enumerate(roles, 1))


def catalog(players: tuple[ProviderPlayer, ...]) -> PlayerCatalog:
    return PlayerCatalog(
        provider="fpl",
        captured_at=datetime(2026, 8, 4, tzinfo=UTC),
        teams=(ProviderPlayerTeam(provider_id="1", name="Arsenal", tla="ARS"),),
        players=players,
    )


def test_selects_highest_rated_valid_starting_xi() -> None:
    lower_rated_striker = player(20, "ST", ea_rating=60)
    snapshot = select_player_snapshot(catalog((*valid_players(), lower_rated_striker)))

    selected = snapshot.players_by_team["1"]
    assert len(selected) == 11
    assert [entry.club_rank for entry in selected] == list(range(1, 12))
    assert "20" not in {entry.player.provider_id for entry in selected}
    assert all(entry.player.rating_model_version == RATING_MODEL_VERSION for entry in selected)


def test_selected_players_use_versioned_ea_rating() -> None:
    selected = select_player_snapshot(catalog(valid_players())).players_by_team["1"]
    assert all(entry.player.ea_rating is not None for entry in selected)
    assert all(entry.player.rating_model_version == "ea-fc-v1" for entry in selected)


def test_global_rank_is_ordered_by_ea_rating() -> None:
    selected = select_player_snapshot(catalog(valid_players())).players_by_team["1"]
    rating_ranked = sorted(selected, key=lambda entry: entry.player.ea_rating or 0, reverse=True)
    assert [entry.global_rank for entry in rating_ranked] == list(range(1, 12))


def test_excludes_non_selectable_players_before_lineup_optimization() -> None:
    unavailable_upgrade = player(20, "ST", ea_rating=99, can_select=False)
    selected = select_player_snapshot(
        catalog((*valid_players(), unavailable_upgrade))
    ).players_by_team["1"]
    assert "20" not in {entry.player.provider_id for entry in selected}


def test_rejects_club_without_complete_valid_lineup() -> None:
    without_goalkeeper = tuple(
        candidate for candidate in valid_players() if candidate.position != "GK"
    )
    with pytest.raises(ValueError, match="cannot produce a rated valid starting XI"):
        select_player_snapshot(catalog(without_goalkeeper))


def test_maps_provider_specific_nottingham_forest_tla() -> None:
    assert internal_team_tla("fpl", "NFO") == "NOT"
    assert internal_team_tla("fpl", "ARS") == "ARS"
