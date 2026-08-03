from __future__ import annotations

import os
from collections.abc import Iterator

import psycopg
import pytest
from psycopg.conninfo import conninfo_to_dict

from premsight_database.migrator import migrate_down_all, migrate_up


def _database_url() -> str:
    url = os.environ.get("DATABASE_URL")
    if not url:
        pytest.skip("DATABASE_URL is required for database tests")
    database_name = conninfo_to_dict(url).get("dbname", "")
    if not database_name.endswith("_test"):
        pytest.fail("Database integration tests require a database name ending in '_test'")
    return url


@pytest.fixture
def database_url() -> str:
    return _database_url()


@pytest.fixture
def migrated_db(database_url: str) -> Iterator[str]:
    migrate_down_all(database_url)
    migrate_up(database_url)
    try:
        yield database_url
    finally:
        migrate_down_all(database_url)


@pytest.fixture
def conn(migrated_db: str) -> Iterator[psycopg.Connection]:
    with psycopg.connect(migrated_db) as connection:
        yield connection
