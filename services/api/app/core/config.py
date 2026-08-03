from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "premsight-api"
    environment: str = "development"
    log_level: str = "info"
    host: str = "0.0.0.0"
    port: int = 8000
    database_url: str = "postgresql://premsight:premsight@localhost:5432/premsight"
    redis_url: str = "redis://localhost:6379/0"
    prediction_engine_url: str = "http://localhost:8001"
    cors_origins: str = "http://localhost:3000"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
