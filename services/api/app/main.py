from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import DEFAULT_AUTH_SECRET, get_settings


def create_app() -> FastAPI:
    settings = get_settings()
    if settings.environment == "production" and settings.auth_secret == DEFAULT_AUTH_SECRET:
        raise RuntimeError("AUTH_SECRET must be set in production")
    application = FastAPI(title=settings.app_name, version="0.1.0")
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    application.include_router(api_router)
    return application


app = create_app()
