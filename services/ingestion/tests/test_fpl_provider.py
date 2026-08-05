import pytest

from app.providers.fpl import _photo_url, _region_codes


def test_region_codes_validate_and_normalize_fpl_regions() -> None:
    assert _region_codes(
        [
            {"id": 200, "iso_code_short": "es"},
            {"id": 243, "iso_code_short": "S1"},
        ]
    ) == {200: "ES", 243: "S1"}


def test_region_codes_reject_unknown_shapes_and_duplicates() -> None:
    with pytest.raises(ValueError, match="two alphanumeric"):
        _region_codes([{"id": 1, "iso_code_short": "ENG"}])
    with pytest.raises(ValueError, match="Duplicate FPL region"):
        _region_codes(
            [
                {"id": 1, "iso_code_short": "EN"},
                {"id": 1, "iso_code_short": "GB"},
            ]
        )


def test_photo_url_validates_and_expands_the_fpl_identifier() -> None:
    assert _photo_url({"photo": "154561.jpg"}) == (
        "https://resources.premierleague.com/premierleague/photos/players/"
        "250x250/p154561.png"
    )
    assert _photo_url({"photo": None}) is None
    with pytest.raises(ValueError, match="numeric identifier"):
        _photo_url({"photo": "player.jpg"})
