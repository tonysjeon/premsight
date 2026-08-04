import argparse

from app.core.config import get_settings
from app.providers.football_data import FootballDataProvider
from app.providers.fpl import FplProvider
from app.repositories.player_snapshots import PostgresPlayerSnapshotRepository
from app.repositories.postgres import PostgresHistoricalRepository
from app.services.historical_sync import HistoricalSyncService
from app.services.player_snapshot import select_player_snapshot


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="premsight-ingest")
    subparsers = parser.add_subparsers(dest="command", required=True)
    historical = subparsers.add_parser("historical-season", help="Import one competition season")
    historical.add_argument("--competition", default="PL")
    historical.add_argument("--season", type=int, required=True, dest="season_start_year")
    subparsers.add_parser("player-snapshot", help="Store the current 18-player club pools")
    return parser


def main() -> None:
    args = build_parser().parse_args()
    settings = get_settings()
    if args.command == "player-snapshot":
        with FplProvider(settings.fpl_base_url) as provider:
            snapshot = select_player_snapshot(provider.player_catalog())
        result = PostgresPlayerSnapshotRepository(settings.database_url).save(snapshot)
    else:
        repository = PostgresHistoricalRepository(settings.database_url)
        with FootballDataProvider(
            api_token=settings.football_data_api_token,
            base_url=settings.football_data_base_url,
        ) as provider:
            result = HistoricalSyncService(provider, repository).sync_season(
                args.competition, args.season_start_year
            )
    print(result.model_dump_json())


if __name__ == "__main__":
    main()
