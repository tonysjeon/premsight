from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Literal
from urllib.parse import urlencode, urlparse

import httpx
import jwt

from app.core.config import Settings, get_settings

OAuthProvider = Literal["google"]

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"


@dataclass(frozen=True)
class OAuthProfile:
    provider: OAuthProvider
    provider_user_id: str
    email: str
    display_name: str
    avatar_url: str | None = None


def google_configured(settings: Settings | None = None) -> bool:
    current = settings or get_settings()
    return bool(current.google_oauth_client_id and current.google_oauth_client_secret)


def encode_oauth_state(
    provider: OAuthProvider,
    return_to: str,
    *,
    now: datetime | None = None,
) -> str:
    settings = get_settings()
    issued = now or datetime.now(UTC)
    return jwt.encode(
        {
            "provider": provider,
            "return_to": return_to,
            "iat": issued,
            "exp": issued + timedelta(minutes=10),
        },
        settings.auth_secret,
        algorithm="HS256",
    )


def decode_oauth_state(token: str) -> tuple[OAuthProvider, str]:
    settings = get_settings()
    payload = jwt.decode(token, settings.auth_secret, algorithms=["HS256"])
    provider = payload.get("provider")
    return_to = payload.get("return_to")
    if provider != "google" or not isinstance(return_to, str):
        raise jwt.InvalidTokenError("invalid oauth state")
    return "google", safe_return_to(return_to)


def safe_return_to(url: str, settings: Settings | None = None) -> str:
    current = settings or get_settings()
    fallback = current.cors_origin_list[0] if current.cors_origin_list else "http://localhost:3000"
    parsed = urlparse(url)
    origin = f"{parsed.scheme}://{parsed.netloc}"
    if parsed.scheme not in {"http", "https"} or origin not in current.cors_origin_list:
        return fallback
    return url


def authorization_url(provider: OAuthProvider, state: str) -> str:
    settings = get_settings()
    query = urlencode(
        {
            "client_id": settings.google_oauth_client_id,
            "redirect_uri": settings.google_oauth_redirect_uri,
            "response_type": "code",
            "scope": "openid email profile",
            "state": state,
            "access_type": "online",
            "prompt": "select_account",
        }
    )
    return f"{GOOGLE_AUTH_URL}?{query}"


def exchange_code(provider: OAuthProvider, code: str) -> OAuthProfile:
    return _exchange_google(code)


def _exchange_google(code: str) -> OAuthProfile:
    settings = get_settings()
    with httpx.Client(timeout=10) as client:
        token_response = client.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.google_oauth_client_id,
                "client_secret": settings.google_oauth_client_secret,
                "redirect_uri": settings.google_oauth_redirect_uri,
                "grant_type": "authorization_code",
            },
        )
        token_response.raise_for_status()
        access_token = token_response.json().get("access_token")
        if not access_token:
            raise ValueError("Google token response did not include an access token")
        profile_response = client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        profile_response.raise_for_status()
    payload = profile_response.json()
    email = str(payload.get("email", "")).strip().lower()
    subject = str(payload.get("sub", "")).strip()
    if not email or not subject:
        raise ValueError("Google profile is missing email or subject")
    name = str(payload.get("name") or email.split("@", 1)[0]).strip()[:80]
    picture = str(payload.get("picture") or "").strip()
    avatar_url = picture if picture.startswith("https://") and len(picture) <= 500 else None
    return OAuthProfile("google", subject, email, name or "Google user", avatar_url)
