"""CLI for PremSight database migrations and seeds."""

from __future__ import annotations

import argparse
import os
import sys

from premsight_database.migrator import (
    migrate_down,
    migrate_down_all,
    migrate_up,
    seed,
    status,
)


def _database_url(explicit: str | None) -> str:
    url = explicit or os.environ.get("DATABASE_URL")
    if not url:
        raise SystemExit(
            "DATABASE_URL is required (env var or --database-url)."
        )
    return url


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(prog="premsight-db")
    parser.add_argument(
        "--database-url",
        help="PostgreSQL connection URL (defaults to DATABASE_URL)",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("up", help="Apply all pending migrations")
    down = sub.add_parser("down", help="Roll back migrations")
    down.add_argument(
        "--steps",
        type=int,
        default=1,
        help="Number of migrations to roll back (default: 1)",
    )
    down.add_argument(
        "--all",
        action="store_true",
        help="Roll back every applied migration",
    )
    sub.add_parser("seed", help="Apply seed SQL files")
    sub.add_parser("status", help="Show applied and pending migrations")

    args = parser.parse_args(argv)
    database_url = _database_url(args.database_url)

    if args.command == "up":
        applied = migrate_up(database_url)
        if applied:
            print("Applied:", ", ".join(applied))
        else:
            print("No pending migrations.")
        return

    if args.command == "down":
        rolled = (
            migrate_down_all(database_url)
            if args.all
            else migrate_down(database_url, steps=args.steps)
        )
        if rolled:
            print("Rolled back:", ", ".join(rolled))
        else:
            print("No migrations to roll back.")
        return

    if args.command == "seed":
        applied = seed(database_url)
        if applied:
            print("Seeded:", ", ".join(applied))
        else:
            print("No seed files found.")
        return

    if args.command == "status":
        applied, pending = status(database_url)
        print("Applied:", ", ".join(applied) if applied else "(none)")
        print("Pending:", ", ".join(pending) if pending else "(none)")
        return

    raise SystemExit(f"Unknown command: {args.command}")


if __name__ == "__main__":
    main(sys.argv[1:])
