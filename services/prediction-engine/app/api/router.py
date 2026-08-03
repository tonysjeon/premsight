from fastapi import APIRouter

from app.api.routes import health, predictions

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(predictions.router)
