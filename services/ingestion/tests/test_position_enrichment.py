from datetime import UTC, datetime

import pytest

from app.domain.models import PlayerCatalog, ProviderPlayer
from app.services.position_enrichment import PlayerEnrichment, enrich_player_positions


def player(position: str = "MID") -> ProviderPlayer:
    return ProviderPlayer(
        provider_id="1",
        team_provider_id="1",
        first_name="Test",
        last_name="Player",
        display_name="Player",
        position=position,
        positions=(position,),
        nationality_code="EN",
        photo_url=None,
        can_select=True,
        availability=100,
        minutes=0,
        starts=0,
        total_points=0,
        ownership=0,
        price=50,
    )


def catalog(value: ProviderPlayer) -> PlayerCatalog:
    return PlayerCatalog(
        provider="fpl",
        captured_at=datetime(2026, 8, 4, tzinfo=UTC),
        teams=(),
        players=(value,),
    )


def test_applies_primary_and_cross_group_alternative_positions() -> None:
    enriched = enrich_player_positions(
        catalog(player()), {"1": PlayerEnrichment(("LM", "LW"), 82)}
    )
    assert enriched.players[0].positions == ("LM", "LW")
    assert enriched.players[0].ea_rating == 82


def test_rejects_override_without_fpl_group_compatibility() -> None:
    with pytest.raises(ValueError, match="Detailed position group mismatch"):
        enrich_player_positions(
            catalog(player()), {"1": PlayerEnrichment(("CB", "RB"), 80)}
        )


def test_keeps_broad_fpl_fallback_when_unmatched() -> None:
    enriched = enrich_player_positions(catalog(player("DEF")), {})
    assert enriched.players[0].positions == ("DEF",)
