from app.core.public_ids import season_key_matches, season_slug, with_team_slug


def test_season_slug_compacts_campaign_years() -> None:
    assert season_slug("2026/2027") == "2026-27"
    assert season_slug("2022-23") == "2022-23"
    assert season_key_matches("2026/2027", "2026-27")
    assert season_key_matches("2026/2027", "2026/2027")
    assert not season_key_matches("2026/2027", "2025-26")


def test_team_slug_uses_tla() -> None:
    assert with_team_slug({"id": "1", "tla": "ARS"})["slug"] == "ars"
    assert with_team_slug({"id": "1", "tla": None})["slug"] is None
