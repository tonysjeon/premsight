from pathlib import Path

from app.providers import fbref
from app.providers.fbref import normalize_position_family


def test_normalize_position_family() -> None:
    assert normalize_position_family("att") == "FWD"
    assert normalize_position_family("GK") == "GK"
    assert normalize_position_family("unknown") == "MID"


def test_load_cached_fbref_stats_reads_family_files(tmp_path: Path, monkeypatch) -> None:
    files = {
        family: tmp_path / f"fbref_pl_{family.lower()}.json" for family in fbref.POSITION_FAMILIES
    }
    monkeypatch.setattr(fbref, "FAMILY_STATS_FILES", files)
    keeper = (
        '[{"name": "David Raya", "team": "Arsenal", "minutes": 900,'
        ' "stats": {}, "features": [1]}]'
    )
    defender = (
        '[{"name": "William Saliba", "team": "Arsenal", "minutes": 900,'
        ' "stats": {}, "features": [1]}]'
    )
    files["GK"].write_text(keeper, encoding="utf-8")
    files["DEF"].write_text(defender, encoding="utf-8")

    keepers = fbref.load_cached_fbref_stats(position="GK")
    assert len(keepers) == 1
    assert keepers[0]["position"] == "GK"
    assert keepers[0]["name"] == "David Raya"

    everyone = fbref.load_cached_fbref_stats()
    assert {row["position"] for row in everyone} == {"GK", "DEF", "MID", "FWD"}


def test_scout_cb_file_has_percentile_axes() -> None:
    defenders = fbref.load_cached_fbref_stats(position="DEF")
    scout = [row for row in defenders if fbref.cb_stats_are_percentiles(row.get("stats"))]
    assert len(scout) == 31
    gabriel = next(row for row in scout if row["name"] == "Gabriel")
    assert gabriel["stats"]["def_duel_pct"] == 43.1
    assert gabriel["stats"]["fwd_pass_pct"] == 47.6
    assert gabriel["features"][0] == 57.8


def test_scout_fb_file_has_percentile_axes_and_side() -> None:
    defenders = fbref.load_cached_fbref_stats(position="DEF")
    scout = [row for row in defenders if fbref.fb_stats_are_percentiles(row.get("stats"))]
    assert len(scout) == 32
    calafiori = next(row for row in scout if row["name"] == "R. Calafiori")
    assert calafiori["scout_position"] == "LB"
    assert calafiori["stats"]["crosses_cmp"] == 3.0
    assert calafiori["stats"]["xa"] == 23.4
    timber = next(row for row in scout if row["name"] == "J. Timber")
    assert timber["scout_position"] == "RB"


def test_scout_mid_file_has_percentile_axes_and_role() -> None:
    mids = fbref.load_cached_fbref_stats(position="MID")
    scout = [row for row in mids if fbref.mid_stats_are_percentiles(row.get("stats"))]
    assert len(scout) == 46
    rice = next(row for row in scout if row["name"] == "D. Rice")
    assert rice["scout_position"] == "CM"
    assert rice["stats"]["key_passes"] == 74.3
    odegaard = next(row for row in scout if row["name"] == "M. Odegaard")
    assert odegaard["scout_position"] == "CAM"


def test_scout_gk_file_has_percentile_axes() -> None:
    keepers = fbref.load_cached_fbref_stats(position="GK")
    assert len(keepers) == 14
    alisson = next(row for row in keepers if row["name"] == "Alisson")
    assert alisson["team"] == "Liverpool"
    assert alisson["minutes"] == 2639
    assert alisson["stats"]["save_pct"] == 18.2
    assert alisson["stats"]["int_padj"] == 89.6
    assert alisson["features"][0] == 14.9


def test_scout_st_file_has_percentile_axes() -> None:
    forwards = fbref.load_cached_fbref_stats(position="FWD")
    scout = [row for row in forwards if fbref.st_stats_are_percentiles(row.get("stats"))]
    assert len(scout) == 18
    gyokeres = next(row for row in scout if row["name"] == "V. Gyökeres")
    assert gyokeres["scout_position"] == "ST"
    assert gyokeres["stats"]["npg"] == 73.0
    assert gyokeres["stats"]["conv_pct"] == 93.3
    assert gyokeres["stats"]["touches_box"] == 67.4
    haaland = next(row for row in scout if row["name"] == "E. Haaland")
    assert haaland["stats"]["aerial_pct"] == 100.0


def test_scout_wg_file_has_percentile_axes_and_side() -> None:
    forwards = fbref.load_cached_fbref_stats(position="FWD")
    scout = [row for row in forwards if fbref.wg_stats_are_percentiles(row.get("stats"))]
    assert len(scout) == 28
    saka = next(row for row in scout if row["name"] == "B. Saka")
    assert saka["scout_position"] == "RW"
    assert saka["stats"]["prog_carries"] == 83.1
    garnacho = next(row for row in scout if row["name"] == "A. Garnacho")
    assert garnacho["scout_position"] == "LW"


