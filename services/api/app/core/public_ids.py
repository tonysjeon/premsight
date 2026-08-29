from __future__ import annotations

import re
from typing import Any
from uuid import UUID

_SEASON_NAME = re.compile(r"^(\d{4})\s*[/–-]\s*(\d{2}|\d{4})$")


def parse_uuid(value: str) -> UUID | None:
    try:
        return UUID(value)
    except ValueError:
        return None


def season_slug(name: str) -> str:
    matched = _SEASON_NAME.fullmatch(name.strip())
    if matched is None:
        return name.strip().lower().replace(" ", "-").replace("/", "-")
    start, end = matched.group(1), matched.group(2)
    return f"{start}-{end[-2:]}"


def season_key_matches(name: str, key: str) -> bool:
    needle = key.strip().replace("/", "-").replace("–", "-")
    if not needle:
        return False
    slug = season_slug(name)
    if needle.casefold() == slug.casefold():
        return True
    return needle.casefold() == name.replace("/", "-").casefold()


def with_season_slug(row: dict[str, Any]) -> dict[str, Any]:
    item = dict(row)
    item["slug"] = season_slug(str(item["name"]))
    return item


def with_team_slug(row: dict[str, Any]) -> dict[str, Any]:
    item = dict(row)
    tla = item.get("tla")
    item["slug"] = str(tla).lower() if tla else None
    return item
