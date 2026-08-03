import argparse

from app.core.config import get_settings
from app.providers.football_data import FootballDataProvider
from app.repositories.postgres import PostgresHistoricalRepository
from app.services.historical_sync import HistoricalSyncService


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="premsight-ingest")
    subparsers = parser.add_subparsers(dest="command", required=True)
    historical = subparsers.add_parser(
        "historical-season", help="Import one competition season"
    )
    historical.add_argument("--competition", default="PL")
    historical.add_argument("--season", type=int, required=True, dest="season_start_year")
    return parser


def main() -> None:
    args = build_parser().parse_args()
    settings = get_settings()
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
