from __future__ import annotations

from collections.abc import Iterable

from app.domain.models import (
    DetailedPlayerPosition,
    PlayerCatalog,
    PlayerSnapshot,
    ProviderPlayer,
    SelectedPlayer,
)

PLAYERS_PER_TEAM = 11
RATING_MODEL_VERSION = "ea-fc-v1"

FORMATIONS: tuple[tuple[str, tuple[DetailedPlayerPosition, ...]], ...] = (
    ("4-3-3", ("GK", "LB", "CB", "CB", "RB", "CM", "CDM", "CM", "LW", "ST", "RW")),
    ("4-4-2", ("GK", "LB", "CB", "CB", "RB", "LM", "CM", "CM", "RM", "ST", "ST")),
    ("3-4-3", ("GK", "CB", "CB", "CB", "LM", "CM", "CM", "RM", "LW", "ST", "RW")),
    ("3-5-2", ("GK", "CB", "CB", "CB", "LM", "CM", "CAM", "CM", "RM", "ST", "ST")),
    ("4-5-1", ("GK", "LB", "CB", "CB", "RB", "LM", "CM", "CAM", "CM", "RM", "ST")),
    ("5-3-2", ("GK", "LWB", "CB", "CB", "CB", "RWB", "CM", "CDM", "CM", "ST", "ST")),
    ("5-2-3", ("GK", "LWB", "CB", "CB", "CB", "RWB", "CM", "CM", "LW", "ST", "RW")),
    ("5-4-1", ("GK", "LWB", "CB", "CB", "CB", "RWB", "LM", "CM", "CM", "RM", "ST")),
)

INTERCHANGEABLE_POSITIONS = (
    frozenset(("LB", "LWB")),
    frozenset(("LM", "LW")),
    frozenset(("RB", "RWB")),
    frozenset(("RM", "RW")),
)


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


def global_rank_key(player: ProviderPlayer) -> tuple[int | float | str, ...]:
    return (-(player.ea_rating or 0), -player.price, *player_rank_key(player))


def _can_fill(player: ProviderPlayer, role: DetailedPlayerPosition) -> bool:
    if role in player.positions:
        return True
    return any(
        role in pair and any(position in pair for position in player.positions)
        for pair in INTERCHANGEABLE_POSITIONS
    )


def _best_lineup(
    candidates: Iterable[ProviderPlayer], roles: tuple[DetailedPlayerPosition, ...]
) -> tuple[ProviderPlayer, ...] | None:
    ordered = tuple(sorted(candidates, key=global_rank_key))
    if len(ordered) < len(roles):
        return None

    incompatible_cost = 10_000
    infinity = 1_000_000_000
    costs = [
        [
            -(player.ea_rating or 0) if _can_fill(player, role) else incompatible_cost
            for player in ordered
        ]
        for role in roles
    ]
    row_count = len(roles)
    column_count = len(ordered)
    row_potential = [0] * (row_count + 1)
    column_potential = [0] * (column_count + 1)
    matched_row = [0] * (column_count + 1)
    previous_column = [0] * (column_count + 1)

    for row in range(1, row_count + 1):
        matched_row[0] = row
        minimum = [infinity] * (column_count + 1)
        used = [False] * (column_count + 1)
        column = 0
        while True:
            used[column] = True
            current_row = matched_row[column]
            delta = infinity
            next_column = 0
            for candidate_column in range(1, column_count + 1):
                if used[candidate_column]:
                    continue
                current = (
                    costs[current_row - 1][candidate_column - 1]
                    - row_potential[current_row]
                    - column_potential[candidate_column]
                )
                if current < minimum[candidate_column]:
                    minimum[candidate_column] = current
                    previous_column[candidate_column] = column
                if minimum[candidate_column] < delta:
                    delta = minimum[candidate_column]
                    next_column = candidate_column
            for candidate_column in range(column_count + 1):
                if used[candidate_column]:
                    row_potential[matched_row[candidate_column]] += delta
                    column_potential[candidate_column] -= delta
                else:
                    minimum[candidate_column] -= delta
            column = next_column
            if matched_row[column] == 0:
                break
        while True:
            prior = previous_column[column]
            matched_row[column] = matched_row[prior]
            column = prior
            if column == 0:
                break

    assignment = [0] * row_count
    for column in range(1, column_count + 1):
        if matched_row[column]:
            assignment[matched_row[column] - 1] = column - 1
    if any(costs[row][column] == incompatible_cost for row, column in enumerate(assignment)):
        return None
    return tuple(ordered[column] for column in assignment)


def select_player_snapshot(catalog: PlayerCatalog) -> PlayerSnapshot:
    selected_players: dict[str, tuple[ProviderPlayer, ...]] = {}
    for team in catalog.teams:
        candidates = tuple(
            player
            for player in catalog.players
            if player.team_provider_id == team.provider_id
            and player.can_select
            and player.ea_rating is not None
        )
        best: tuple[int, int, tuple[ProviderPlayer, ...]] | None = None
        for formation_index, (_, roles) in enumerate(FORMATIONS):
            lineup = _best_lineup(candidates, roles)
            if lineup is None:
                continue
            option = (sum(player.ea_rating or 0 for player in lineup), -formation_index, lineup)
            if best is None or option[:2] > best[:2]:
                best = option
        if best is None:
            raise ValueError(f"FPL team {team.name} cannot produce a rated valid starting XI")
        selected_players[team.provider_id] = best[2]

    all_selected = tuple(player for players in selected_players.values() for player in players)
    global_ranks = {
        player.provider_id: rank
        for rank, player in enumerate(sorted(all_selected, key=global_rank_key), start=1)
    }
    selected = {
        team_id: tuple(
            SelectedPlayer(
                player=player.model_copy(
                    update={"rating_model_version": RATING_MODEL_VERSION}
                ),
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
