from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

import jwt

from app.core.config import get_settings


def create_session_token(user_id: UUID | str, *, now: datetime | None = None) -> str:
    settings = get_settings()
    issued = now or datetime.now(UTC)
    payload = {
        "sub": str(user_id),
        "iat": issued,
        "exp": issued + timedelta(seconds=settings.auth_token_ttl_seconds),
    }
    return jwt.encode(payload, settings.auth_secret, algorithm="HS256")


def decode_session_token(token: str) -> dict[str, Any]:
    settings = get_settings()
    payload = jwt.decode(token, settings.auth_secret, algorithms=["HS256"])
    if "sub" not in payload:
        raise jwt.InvalidTokenError("missing sub")
    return payload
