from app.domain.models import PlayerCatalog, PlayerSnapshot, ProviderPlayer, SelectedPlayer

PLAYERS_PER_TEAM = 18


def player_rank_key(player: ProviderPlayer) -> tuple[int | float | str, ...]:
    return (
        -player.availability,
        -player.minutes,
        -player.starts,
        -player.total_points,
        -player.ownership,
        -player.price,
        player.display_name.casefold(),
        int(player.provider_id),
    )


def select_player_snapshot(catalog: PlayerCatalog) -> PlayerSnapshot:
    selected_players: dict[str, list[ProviderPlayer]] = {}
    for team in catalog.teams:
        candidates = [
            player
            for player in catalog.players
            if player.team_provider_id == team.provider_id and player.can_select
        ]
        candidates.sort(key=player_rank_key)
        if len(candidates) < PLAYERS_PER_TEAM:
            raise ValueError(
                f"FPL team {team.name} has {len(candidates)} selectable players; "
                f"{PLAYERS_PER_TEAM} required"
            )
        selected_players[team.provider_id] = candidates[:PLAYERS_PER_TEAM]

    global_ranks = {
        player.provider_id: rank
        for rank, player in enumerate(
            sorted(
                (player for players in selected_players.values() for player in players),
                key=player_rank_key,
            ),
            start=1,
        )
    }
    selected = {
        team_id: tuple(
            SelectedPlayer(
                player=player,
                club_rank=club_rank,
                global_rank=global_ranks[player.provider_id],
            )
            for club_rank, player in enumerate(players, start=1)
        )
        for team_id, players in selected_players.items()
    }
    return PlayerSnapshot(
        provider=catalog.provider,
        captured_at=catalog.captured_at,
        teams=catalog.teams,
        players_by_team=selected,
    )
