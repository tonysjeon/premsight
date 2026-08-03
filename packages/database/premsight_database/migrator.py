"""Apply and roll back ordered SQL migrations."""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

import psycopg
from psycopg import ClientCursor

from premsight_database.paths import MIGRATIONS_DIR, SEEDS_DIR

MIGRATION_VERSION_RE = re.compile(r"^(\d{4})_.+\.(up|down)\.sql$")


def _connect(database_url: str) -> psycopg.Connection:
    # ClientCursor uses the simple query protocol so multi-statement SQL files work.
    return psycopg.connect(database_url, cursor_factory=ClientCursor, autocommit=False)


@dataclass(frozen=True, order=True)
class Migration:
    version: str
    name: str
    up_path: Path
    down_path: Path


def discover_migrations(migrations_dir: Path = MIGRATIONS_DIR) -> list[Migration]:
    ups: dict[str, Path] = {}
    downs: dict[str, Path] = {}

    for path in sorted(migrations_dir.glob("*.sql")):
        match = MIGRATION_VERSION_RE.match(path.name)
        if match is None:
            raise ValueError(
                f"Invalid migration filename {path.name!r}; "
                "expected NNNN_name.up.sql or NNNN_name.down.sql"
            )
        version, direction = match.groups()
        if direction == "up":
            ups[version] = path
        else:
            downs[version] = path

    missing_down = sorted(set(ups) - set(downs))
    missing_up = sorted(set(downs) - set(ups))
    if missing_down or missing_up:
        details: list[str] = []
        if missing_down:
            details.append(f"missing down for {', '.join(missing_down)}")
        if missing_up:
            details.append(f"missing up for {', '.join(missing_up)}")
        raise ValueError("; ".join(details))

    migrations: list[Migration] = []
    for version in sorted(ups):
        up_path = ups[version]
        stem = up_path.name.removesuffix(".up.sql")
        migrations.append(
            Migration(
                version=version,
                name=stem,
                up_path=up_path,
                down_path=downs[version],
            )
        )
    return migrations


def ensure_migrations_table(conn: psycopg.Connection) -> None:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )


def applied_versions(conn: psycopg.Connection) -> list[str]:
    ensure_migrations_table(conn)
    rows = conn.execute(
        "SELECT version FROM schema_migrations ORDER BY version"
    ).fetchall()
    return [row[0] for row in rows]


def migrate_up(
    database_url: str,
    *,
    migrations_dir: Path = MIGRATIONS_DIR,
) -> list[str]:
    migrations = discover_migrations(migrations_dir)
    applied: list[str] = []

    with _connect(database_url) as conn:
        ensure_migrations_table(conn)
        current = set(applied_versions(conn))
        for migration in migrations:
            if migration.version in current:
                continue
            sql = migration.up_path.read_text(encoding="utf-8")
            conn.execute(sql)
            conn.execute(
                "INSERT INTO schema_migrations (version, name) VALUES (%s, %s)",
                (migration.version, migration.name),
            )
            conn.commit()
            applied.append(migration.version)
    return applied


def migrate_down(
    database_url: str,
    *,
    steps: int = 1,
    migrations_dir: Path = MIGRATIONS_DIR,
) -> list[str]:
    if steps < 1:
        raise ValueError("steps must be >= 1")

    migrations = {m.version: m for m in discover_migrations(migrations_dir)}
    rolled_back: list[str] = []

    with _connect(database_url) as conn:
        current = applied_versions(conn)
        for version in reversed(current[-steps:]):
            migration = migrations.get(version)
            if migration is None:
                raise RuntimeError(
                    f"Applied migration {version} has no matching files in {migrations_dir}"
                )
            sql = migration.down_path.read_text(encoding="utf-8")
            conn.execute(sql)
            conn.execute(
                "DELETE FROM schema_migrations WHERE version = %s",
                (version,),
            )
            conn.commit()
            rolled_back.append(version)
    return rolled_back


def migrate_down_all(
    database_url: str,
    *,
    migrations_dir: Path = MIGRATIONS_DIR,
) -> list[str]:
    with _connect(database_url) as conn:
        count = len(applied_versions(conn))
    if count == 0:
        return []
    return migrate_down(database_url, steps=count, migrations_dir=migrations_dir)


def seed(
    database_url: str,
    *,
    seeds_dir: Path = SEEDS_DIR,
) -> list[str]:
    seed_files = sorted(seeds_dir.glob("*.sql"))
    applied: list[str] = []
    with _connect(database_url) as conn:
        for path in seed_files:
            conn.execute(path.read_text(encoding="utf-8"))
            conn.commit()
            applied.append(path.name)
    return applied


def status(
    database_url: str,
    *,
    migrations_dir: Path = MIGRATIONS_DIR,
) -> tuple[list[str], list[str]]:
    migrations = discover_migrations(migrations_dir)
    with _connect(database_url) as conn:
        current = set(applied_versions(conn))
    applied = [m.version for m in migrations if m.version in current]
    pending = [m.version for m in migrations if m.version not in current]
    return applied, pending
