from datetime import UTC, datetime, timedelta

import jwt
import pytest

from app.clients.oauth import decode_oauth_state, encode_oauth_state, safe_return_to
from app.core.config import get_settings
from app.core.security import create_session_token, decode_session_token


def test_session_token_roundtrip() -> None:
    user_id = "11111111-1111-1111-1111-111111111111"
    payload = decode_session_token(create_session_token(user_id))
    assert payload["sub"] == user_id


def test_expired_session_token_is_rejected() -> None:
    token = create_session_token(
        "11111111-1111-1111-1111-111111111111",
        now=datetime.now(UTC) - timedelta(days=30),
    )
    with pytest.raises(jwt.ExpiredSignatureError):
        decode_session_token(token)


def test_oauth_state_roundtrip_and_rejects_foreign_origins() -> None:
    token = encode_oauth_state("google", "http://localhost:3000/table")
    provider, return_to = decode_oauth_state(token)
    assert provider == "google"
    assert return_to == "http://localhost:3000/table"
    assert safe_return_to("https://evil.example") == get_settings().cors_origin_list[0]
