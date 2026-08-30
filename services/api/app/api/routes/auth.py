from typing import Annotated, Any, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from fastapi.responses import RedirectResponse
from httpx import HTTPError
from jwt import InvalidTokenError

from app.clients.oauth import (
    OAuthProvider,
    authorization_url,
    decode_oauth_state,
    encode_oauth_state,
    exchange_code,
    google_configured,
    safe_return_to,
)
from app.core.config import get_settings
from app.core.security import create_session_token, decode_session_token
from app.repositories.users import UsersRepository
from app.schemas.auth import AuthProviders, AuthUser

router = APIRouter(prefix="/v1/auth", tags=["auth"])
Provider = Literal["google"]


def repository() -> UsersRepository:
    return UsersRepository(get_settings().database_url)


Repo = Annotated[UsersRepository, Depends(repository)]


def _public_user(row: dict[str, Any]) -> AuthUser:
    return AuthUser(
        id=str(row["id"]),
        email=row["email"],
        display_name=row["display_name"],
        avatar_url=row.get("avatar_url"),
        provider=str(row.get("provider") or "google"),
        provider_user_id=str(row.get("provider_user_id") or ""),
    )


def _set_session_cookie(response: Response, user_id: UUID | str) -> None:
    settings = get_settings()
    response.set_cookie(
        key=settings.auth_cookie_name,
        value=create_session_token(user_id),
        httponly=True,
        samesite=settings.auth_cookie_samesite,
        secure=settings.auth_cookie_secure,
        max_age=settings.auth_token_ttl_seconds,
        path="/",
    )


def _clear_session_cookie(response: Response) -> None:
    settings = get_settings()
    response.delete_cookie(
        key=settings.auth_cookie_name,
        path="/",
        samesite=settings.auth_cookie_samesite,
        secure=settings.auth_cookie_secure,
    )


def current_user(request: Request, repo: Repo) -> AuthUser:
    settings = get_settings()
    token = request.cookies.get(settings.auth_cookie_name)
    if not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not signed in")
    try:
        payload = decode_session_token(token)
    except InvalidTokenError as error:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not signed in") from error
    user = repo.get_by_id(str(payload["sub"]))
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not signed in")
    return _public_user(user)


CurrentUser = Annotated[AuthUser, Depends(current_user)]


def _provider_ready(provider: OAuthProvider) -> bool:
    return google_configured() if provider == "google" else False


@router.get("/providers")
def providers() -> AuthProviders:
    return AuthProviders(google=google_configured())


@router.get("/me")
def me(user: CurrentUser) -> AuthUser:
    return user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response) -> None:
    _clear_session_cookie(response)


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(user: CurrentUser, repo: Repo, response: Response) -> None:
    if not repo.delete_by_id(user.id):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not signed in")
    _clear_session_cookie(response)


@router.get("/{provider}/start")
def start_oauth(
    provider: Provider,
    return_to: Annotated[str | None, Query()] = None,
) -> RedirectResponse:
    if not _provider_ready(provider):
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            f"{provider.title()} sign-in is not configured",
        )
    target = safe_return_to(return_to or "")
    state = encode_oauth_state(provider, target)
    return RedirectResponse(authorization_url(provider, state), status_code=302)


@router.get("/{provider}/callback")
def oauth_callback(
    provider: Provider,
    repo: Repo,
    code: Annotated[str | None, Query()] = None,
    state: Annotated[str | None, Query()] = None,
    error: Annotated[str | None, Query()] = None,
) -> RedirectResponse:
    try:
        expected_provider, return_to = decode_oauth_state(state or "")
    except InvalidTokenError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid sign-in state") from None
    if expected_provider != provider:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid sign-in state")
    if error or not code:
        return RedirectResponse(_with_query(return_to, "auth_error=cancelled"), status_code=302)
    try:
        profile = exchange_code(provider, code)
    except (ValueError, OSError, InvalidTokenError, HTTPError) as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Sign-in failed") from exc
    user = repo.upsert_oauth_user(
        provider=profile.provider,
        provider_user_id=profile.provider_user_id,
        email=profile.email,
        display_name=profile.display_name,
        avatar_url=profile.avatar_url,
    )
    redirect = RedirectResponse(_with_query(return_to, "signed_in=1"), status_code=302)
    _set_session_cookie(redirect, user["id"])
    return redirect


def _with_query(url: str, query: str) -> str:
    separator = "&" if "?" in url else "?"
    return f"{url}{separator}{query}"
