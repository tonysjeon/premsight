from datetime import UTC, datetime

import pytest

from app.domain.models import PlayerCatalog, ProviderPlayer, ProviderPlayerTeam
from app.repositories.player_snapshots import internal_team_tla
from app.services.player_snapshot import select_player_snapshot


def player(provider_id: int, *, points: int, can_select: bool = True) -> ProviderPlayer:
    return ProviderPlayer(
        provider_id=str(provider_id),
        team_provider_id="1",
        first_name="Player",
        last_name=str(provider_id),
        display_name=f"Player {provider_id}",
        position="MID",
        nationality_code="EN",
        photo_url="https://resources.premierleague.com/player.png",
        can_select=can_select,
        availability=100,
        minutes=0,
        starts=0,
        total_points=points,
        ownership=0,
        price=50,
    )


def catalog(players: tuple[ProviderPlayer, ...]) -> PlayerCatalog:
    return PlayerCatalog(
        provider="fpl",
        captured_at=datetime(2026, 8, 4, tzinfo=UTC),
        teams=(ProviderPlayerTeam(provider_id="1", name="Arsenal", tla="ARS"),),
        players=players,
    )


def test_selects_exactly_top_18_without_squad_roles() -> None:
    snapshot = select_player_snapshot(
        catalog(tuple(player(index, points=index) for index in range(1, 21)))
    )

    selected = snapshot.players_by_team["1"]
    assert len(selected) == 18
    assert [entry.club_rank for entry in selected] == list(range(1, 19))
    assert [entry.player.provider_id for entry in selected[:3]] == ["20", "19", "18"]
    assert [entry.global_rank for entry in selected[:3]] == [1, 2, 3]
    assert not hasattr(selected[0], "squad_role")


def test_excludes_non_selectable_players_before_ranking() -> None:
    players = tuple(player(index, points=index, can_select=index != 20) for index in range(1, 21))
    selected = select_player_snapshot(catalog(players)).players_by_team["1"]
    assert "20" not in {entry.player.provider_id for entry in selected}


def test_rejects_incomplete_club_pool() -> None:
    with pytest.raises(ValueError, match="17 selectable players; 18 required"):
        select_player_snapshot(
            catalog(tuple(player(index, points=index) for index in range(1, 18)))
        )


def test_maps_provider_specific_nottingham_forest_tla() -> None:
    assert internal_team_tla("fpl", "NFO") == "NOT"
    assert internal_team_tla("fpl", "ARS") == "ARS"
