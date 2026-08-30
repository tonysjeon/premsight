from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict

DEFAULT_AUTH_SECRET = "dev-insecure-premsight-auth-secret"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../../.env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "premsight-api"
    environment: str = "development"
    log_level: str = "info"
    host: str = "0.0.0.0"
    port: int = 8000
    database_url: str = "postgresql://premsight:premsight@localhost:5432/premsight"
    redis_url: str = "redis://localhost:6379/0"
    prediction_engine_url: str = "http://localhost:8001"
    cors_origins: str = "http://localhost:3000"
    auth_secret: str = DEFAULT_AUTH_SECRET
    auth_cookie_name: str = "premsight_session"
    auth_cookie_samesite: Literal["lax", "strict", "none"] = "lax"
    auth_cookie_secure: bool = False
    auth_token_ttl_seconds: int = 60 * 60 * 24 * 14
    google_oauth_client_id: str = ""
    google_oauth_client_secret: str = ""
    google_oauth_redirect_uri: str = "http://localhost:8000/v1/auth/google/callback"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
