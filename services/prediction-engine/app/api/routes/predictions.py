from fastapi import APIRouter, HTTPException
from pydantic import Field

from app.domain.models import DomainModel, MatchResult, Prediction
from app.model.poisson_v1 import predict
from app.model.ratings import InsufficientHistoryError

router = APIRouter(prefix="/v1", tags=["predictions"])


class PredictionRequest(DomainModel):
    home_team_id: str = Field(min_length=1)
    away_team_id: str = Field(min_length=1)
    results: list[MatchResult] = Field(min_length=1)
    max_goals: int = Field(default=10, ge=1, le=20)


@router.post("/predict", response_model=Prediction)
def create_prediction(request: PredictionRequest) -> Prediction:
    try:
        return predict(
            request.results,
            request.home_team_id,
            request.away_team_id,
            request.max_goals,
        )
    except InsufficientHistoryError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
