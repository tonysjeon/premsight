from pydantic import BaseModel


class AuthUser(BaseModel):
    id: str
    email: str
    display_name: str
    avatar_url: str | None = None
    provider: str
    provider_user_id: str


class AuthProviders(BaseModel):
    google: bool
