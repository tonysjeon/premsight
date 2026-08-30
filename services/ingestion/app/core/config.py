from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../../.env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "premsight-ingestion"
    environment: str = "development"
    log_level: str = "info"
    host: str = "0.0.0.0"
    port: int = 8002
    database_url: str = "postgresql://premsight:premsight@localhost:5432/premsight"
    football_data_api_token: str = ""
    football_data_base_url: str = "https://api.football-data.org/v4"
    fpl_base_url: str = "https://fantasy.premierleague.com"
    schedule_enabled: bool = True
    schedule_interval_seconds: int = Field(default=900, ge=60)
    schedule_run_on_startup: bool = True
    ingest_competition: str = Field(default="PL", min_length=1)
    ingest_season_start_year: int | None = Field(default=None, ge=1992)


@lru_cache
def get_settings() -> Settings:
    return Settings()


def scheduler_should_run(settings: Settings) -> bool:
    return settings.schedule_enabled and bool(settings.football_data_api_token.strip())
