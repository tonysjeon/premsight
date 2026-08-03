from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "premsight-ingestion"
    environment: str = "development"
    log_level: str = "info"
    host: str = "0.0.0.0"
    port: int = 8002
    database_url: str = "postgresql://premsight:premsight@localhost:5432/premsight"


@lru_cache
def get_settings() -> Settings:
    return Settings()
