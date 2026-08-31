import argparse
import json
import logging

from app.core.config import get_settings
from app.providers.fbref import FbrefProvider
from app.providers.fpl import FplProvider
from app.providers.openfootball import OpenFootballProvider
from app.repositories.player_snapshots import PostgresPlayerSnapshotRepository
from app.repositories.player_stats import PostgresPlayerStatsRepository
from app.repositories.players import PostgresPlayerRosterRepository
from app.repositories.postgres import PostgresHistoricalRepository
from app.services.fixture_refresh import run_refresh_tick, sync_competition_season
from app.services.player_snapshot import select_player_snapshot
from app.services.position_enrichment import enrich_player_positions, load_position_overrides


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="premsight-ingest")
    subparsers = parser.add_subparsers(dest="command", required=True)
    historical = subparsers.add_parser("historical-season", help="Import one competition season")
    historical.add_argument("--competition", default="PL")
    historical.add_argument("--season", type=int, required=True, dest="season_start_year")
    subparsers.add_parser("player-snapshot", help="Store each club's projected starting XI")
    subparsers.add_parser("players", help="Store full player roster and memberships from FPL")
    subparsers.add_parser("player-stats", help="Store player season stats and features from FBref")
    openfb = subparsers.add_parser(
        "openfootball-season",
        help="Import one season from openfootball",
    )
    openfb.add_argument("--season", type=int, required=True, dest="season_start_year")
    subparsers.add_parser(
        "refresh",
        help="One scheduler tick: results in a match window, else schedule if stale",
    )
    return parser


def main() -> None:
    args = build_parser().parse_args()
    settings = get_settings()
    if args.command == "player-snapshot":
        with FplProvider(settings.fpl_base_url) as provider:
            catalog = enrich_player_positions(provider.player_catalog(), load_position_overrides())
            snapshot = select_player_snapshot(catalog)
        result = PostgresPlayerSnapshotRepository(settings.database_url).save(snapshot)
    elif args.command == "players":
        with FplProvider(settings.fpl_base_url) as provider:
            catalog = enrich_player_positions(provider.player_catalog(), load_position_overrides())
        result = PostgresPlayerRosterRepository(settings.database_url).sync_players(catalog)
    elif args.command == "player-stats":
        provider = FbrefProvider()
        season_stats = provider.fetch_season_stats(2026)
        result = PostgresPlayerStatsRepository(settings.database_url).sync_stats(season_stats)
    elif args.command == "openfootball-season":
        provider = OpenFootballProvider()
        snapshot = provider.fetch_season_snapshot(args.season_start_year)
        repo = PostgresHistoricalRepository(settings.database_url)
        result = repo.sync_snapshot(snapshot)
    elif args.command == "refresh":
        logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
        try:
            delay = run_refresh_tick(settings)
        except ValueError as exc:
            raise SystemExit(str(exc)) from exc
        print(json.dumps({"sleep_seconds": delay}))
        return
    else:
        result = sync_competition_season(settings, args.competition, args.season_start_year)
    print(result.model_dump_json())


if __name__ == "__main__":
    main()
