from datetime import UTC, datetime

import pytest

from app.domain.models import PlayerCatalog, ProviderPlayer, ProviderPlayerTeam
from app.repositories.player_snapshots import internal_team_tla
from app.services.player_snapshot import select_player_snapshot


def player(
    provider_id: int,
    *,
    points: int,
    position: str = "MID",
    price: int = 50,
    can_select: bool = True,
) -> ProviderPlayer:
    return ProviderPlayer(
        provider_id=str(provider_id),
        team_provider_id="1",
        first_name="Player",
        last_name=str(provider_id),
        display_name=f"Player {provider_id}",
        position=position,
        positions=(position,),
        nationality_code="EN",
        photo_url="https://resources.premierleague.com/player.png",
        can_select=can_select,
        availability=100,
        minutes=0,
        starts=0,
        total_points=points,
        ownership=0,
        price=price,
    )


def catalog(players: tuple[ProviderPlayer, ...]) -> PlayerCatalog:
    return PlayerCatalog(
        provider="fpl",
        captured_at=datetime(2026, 8, 4, tzinfo=UTC),
        teams=(ProviderPlayerTeam(provider_id="1", name="Arsenal", tla="ARS"),),
        players=players,
    )


def test_selects_one_goalkeeper_and_top_15_outfield_players() -> None:
    players = tuple(player(index, points=index, price=50 + index) for index in range(1, 21)) + (
        player(101, points=100, position="GK", price=45),
        player(102, points=90, position="GK", price=60),
    )
    snapshot = select_player_snapshot(catalog(players))

    selected = snapshot.players_by_team["1"]
    assert len(selected) == 16
    assert [entry.club_rank for entry in selected] == list(range(1, 17))
    assert [entry.player.provider_id for entry in selected if entry.player.position == "GK"] == [
        "101"
    ]
    assert {entry.player.provider_id for entry in selected if entry.player.position != "GK"} == {
        str(index) for index in range(6, 21)
    }
    assert not hasattr(selected[0], "squad_role")


def test_global_rank_is_ordered_by_fpl_price() -> None:
    players = tuple(
        player(index, points=100 - index, price=40 + index) for index in range(1, 17)
    ) + (player(101, points=200, position="GK", price=45),)
    selected = select_player_snapshot(catalog(players)).players_by_team["1"]

    price_ranked = sorted(selected, key=lambda entry: entry.player.price, reverse=True)
    assert [entry.global_rank for entry in price_ranked] == list(range(1, 17))


def test_excludes_non_selectable_players_before_ranking() -> None:
    players = tuple(
        player(index, points=index, can_select=index != 20) for index in range(1, 21)
    ) + (player(101, points=100, position="GK"),)
    selected = select_player_snapshot(catalog(players)).players_by_team["1"]
    assert "20" not in {entry.player.provider_id for entry in selected}


def test_rejects_incomplete_club_pool() -> None:
    with pytest.raises(
        ValueError, match="0 selectable goalkeepers and 15 selectable outfield players"
    ):
        select_player_snapshot(
            catalog(tuple(player(index, points=index) for index in range(1, 16)))
        )


def test_maps_provider_specific_nottingham_forest_tla() -> None:
    assert internal_team_tla("fpl", "NFO") == "NOT"
    assert internal_team_tla("fpl", "ARS") == "ARS"
