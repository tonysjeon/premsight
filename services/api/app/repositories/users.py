from typing import Any, Literal
from uuid import UUID

import psycopg
from psycopg.rows import dict_row

OAuthProvider = Literal["google"]

_USER_SELECT = """
    SELECT u.id, u.email, u.display_name, u.avatar_url,
           i.provider, i.provider_user_id
    FROM users u
    LEFT JOIN oauth_identities i ON i.user_id = u.id
    WHERE u.id = %s
"""


class UsersRepository:
    def __init__(self, database_url: str) -> None:
        self._database_url = database_url

    def _one(self, query: str, params: tuple[object, ...] = ()) -> dict[str, Any] | None:
        with psycopg.connect(self._database_url, row_factory=dict_row) as conn:
            return conn.execute(query, params).fetchone()

    def get_by_id(self, user_id: UUID | str) -> dict[str, Any] | None:
        return self._one(_USER_SELECT, (str(user_id),))

    def delete_by_id(self, user_id: UUID | str) -> bool:
        with psycopg.connect(self._database_url, row_factory=dict_row) as conn:
            deleted = conn.execute("DELETE FROM users WHERE id=%s", (str(user_id),))
            return deleted.rowcount > 0

    def upsert_oauth_user(
        self,
        *,
        provider: OAuthProvider,
        provider_user_id: str,
        email: str,
        display_name: str,
        avatar_url: str | None,
    ) -> dict[str, Any]:
        with psycopg.connect(self._database_url, row_factory=dict_row) as conn:
            identity = conn.execute(
                """SELECT user_id FROM oauth_identities
                   WHERE provider=%s AND provider_user_id=%s""",
                (provider, provider_user_id),
            ).fetchone()
            if identity is not None:
                conn.execute(
                    """UPDATE users
                       SET display_name=%s, avatar_url=%s, updated_at=now()
                       WHERE id=%s""",
                    (display_name, avatar_url, identity["user_id"]),
                )
                user = conn.execute(_USER_SELECT, (identity["user_id"],)).fetchone()
                if user is None:
                    raise RuntimeError("OAuth identity is missing its user")
                return user

            user = conn.execute(
                "SELECT id FROM users WHERE email=%s",
                (email,),
            ).fetchone()
            if user is None:
                user = conn.execute(
                    """INSERT INTO users (email, display_name, avatar_url)
                       VALUES (%s, %s, %s)
                       RETURNING id""",
                    (email, display_name, avatar_url),
                ).fetchone()
            else:
                conn.execute(
                    """UPDATE users
                       SET display_name=%s, avatar_url=%s, updated_at=now()
                       WHERE id=%s""",
                    (display_name, avatar_url, user["id"]),
                )
            if user is None:
                raise RuntimeError("Failed to create user")
            conn.execute(
                """INSERT INTO oauth_identities (user_id, provider, provider_user_id)
                   VALUES (%s, %s, %s)""",
                (user["id"], provider, provider_user_id),
            )
            linked = conn.execute(_USER_SELECT, (user["id"],)).fetchone()
            if linked is None:
                raise RuntimeError("Failed to load user")
            return linked
