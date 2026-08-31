from app.scout import (
    _matches_query,
    load_scout_rows,
    match_scout_name,
    scout_slot,
    scout_stats_for_player,
)


def test_scout_slot_maps_fullback_aliases() -> None:
    assert scout_slot("GK") == "GK"
    assert scout_slot("cb") == "CB"
    assert scout_slot("LB") == "FB"
    assert scout_slot("RB") == "FB"
    assert scout_slot("MID") == "MID"
    assert scout_slot("ST") == "ST"
    assert scout_slot("CF") == "ST"
    assert scout_slot("WG") == "WG"
    assert scout_slot("LW") == "WG"
    assert scout_slot("RW") == "WG"


def test_scout_csvs_load() -> None:
    assert len(load_scout_rows("GK")) == 14
    assert len(load_scout_rows("CB")) == 31
    assert len(load_scout_rows("FB")) == 32
    assert len(load_scout_rows("MID")) == 46
    assert len(load_scout_rows("ST")) == 18
    assert len(load_scout_rows("WG")) == 28
    assert load_scout_rows("FB")[1]["scout_position"] == "RB"
    assert load_scout_rows("FB")[1]["name"] == "J. Timber"
    assert load_scout_rows("MID")[0]["name"] == "D. Rice"
    assert load_scout_rows("MID")[0]["scout_position"] == "CM"
    assert load_scout_rows("MID")[2]["scout_position"] == "CAM"
    assert load_scout_rows("ST")[0]["name"] == "V. Gyökeres"
    assert load_scout_rows("WG")[0]["name"] == "B. Saka"
    assert load_scout_rows("WG")[0]["scout_position"] == "RW"
    assert load_scout_rows("WG")[1]["scout_position"] == "LW"


def test_match_scout_name_initial_and_display() -> None:
    raya = {
        "id": "raya",
        "first_name": "David",
        "last_name": "Raya Martín",
        "display_name": "Raya",
    }
    saliba = {
        "id": "saliba",
        "first_name": "William",
        "last_name": "Saliba",
        "display_name": "Saliba",
    }
    silva = {
        "id": "silva",
        "first_name": "António",
        "last_name": "Silva",
        "display_name": "Silva",
    }
    dasilva = {
        "id": "dasilva",
        "first_name": "Jay",
        "last_name": "Dasilva",
        "display_name": "Dasilva",
    }
    alisson = {
        "id": "alisson",
        "first_name": "Alisson",
        "last_name": "Becker",
        "display_name": "A.Becker",
    }
    gabriel = {
        "id": "gabriel",
        "first_name": "Gabriel",
        "last_name": "Magalhaes",
        "display_name": "Gabriel",
    }
    timber = {
        "id": "timber",
        "first_name": "Jurrien",
        "last_name": "Timber",
        "display_name": "Timber",
    }
    rice = {
        "id": "rice",
        "first_name": "Declan",
        "last_name": "Rice",
        "display_name": "Rice",
    }
    odegaard = {
        "id": "odegaard",
        "first_name": "Martin",
        "last_name": "Ødegaard",
        "display_name": "Ødegaard",
    }
    andrey = {
        "id": "andrey",
        "first_name": "Andrey",
        "last_name": "Nascimento dos Santos",
        "display_name": "Andrey Santos",
    }
    alysson = {
        "id": "alysson",
        "first_name": "Alysson Edward Franco",
        "last_name": "da Rocha dos Santos",
        "display_name": "Alysson",
    }
    petrovic = {
        "id": "petrovic",
        "first_name": "Đorđe",
        "last_name": "Petrović",
        "display_name": "Petrović",
    }
    gudmundsson = {
        "id": "gudmundsson",
        "first_name": "Gabriel",
        "last_name": "Gudmundsson",
        "display_name": "Gudmundsson",
    }
    pool = [
        raya,
        saliba,
        silva,
        dasilva,
        alisson,
        gabriel,
        timber,
        petrovic,
        gudmundsson,
        rice,
        odegaard,
        andrey,
        alysson,
    ]
    assert match_scout_name("David Raya", pool)["id"] == "raya"
    assert match_scout_name("David Raya", [raya])["id"] == "raya"
    assert match_scout_name("W. Saliba", pool)["id"] == "saliba"
    assert match_scout_name("A. Silva", pool)["id"] == "silva"
    assert match_scout_name("Alisson", pool)["id"] == "alisson"
    assert match_scout_name("Gabriel", pool)["id"] == "gabriel"
    assert match_scout_name("J. Timber", pool)["id"] == "timber"
    assert match_scout_name("D. Petrović", pool)["id"] == "petrovic"
    assert match_scout_name("D. Rice", pool)["id"] == "rice"
    assert match_scout_name("M. Odegaard", pool)["id"] == "odegaard"
    assert match_scout_name("A. Santos", pool)["id"] == "andrey"


def test_scout_stats_for_player_uses_csv_not_fbref() -> None:
    player = {
        "id": "timber",
        "first_name": "Jurrien",
        "last_name": "Timber",
        "display_name": "Timber",
    }
    overlay = scout_stats_for_player(player)
    assert overlay is not None
    assert overlay["season_stats"]["provider"] == "scout-csv"
    assert overlay["scout_position"] == "RB"
    assert overlay["season_stats"]["stats"]["crosses_cmp"] == 6.5


def test_scout_stats_for_midfielder_uses_csv() -> None:
    player = {
        "id": "rice",
        "first_name": "Declan",
        "last_name": "Rice",
        "display_name": "Rice",
    }
    overlay = scout_stats_for_player(player)
    assert overlay is not None
    assert overlay["season_stats"]["provider"] == "scout-csv"
    assert overlay["scout_position"] == "CM"
    assert overlay["season_stats"]["stats"]["duel_pct"] == 75.7


def test_scout_stats_for_striker_uses_csv() -> None:
    player = {
        "id": "gyokeres",
        "first_name": "Viktor",
        "last_name": "Gyökeres",
        "display_name": "Gyökeres",
    }
    overlay = scout_stats_for_player(player)
    assert overlay is not None
    assert overlay["season_stats"]["provider"] == "scout-csv"
    assert overlay["season_stats"]["stats"]["npg"] == 73.0
    assert overlay["season_stats"]["stats"]["conv_pct"] == 93.3
    assert overlay["season_stats"]["stats"]["touches_box"] == 67.4


def test_scout_stats_for_winger_uses_csv() -> None:
    player = {
        "id": "saka",
        "first_name": "Bukayo",
        "last_name": "Saka",
        "display_name": "Saka",
    }
    overlay = scout_stats_for_player(player)
    assert overlay is not None
    assert overlay["season_stats"]["provider"] == "scout-csv"
    assert overlay["scout_position"] == "RW"
    assert overlay["season_stats"]["stats"]["prog_carries"] == 83.1
    assert overlay["season_stats"]["stats"]["dribbles_cmp"] == 94.1
    assert overlay["season_stats"]["stats"]["key_passes"] == 97.1


def test_matches_query_accent_insensitive() -> None:
    player = {
        "first_name": "Viktor",
        "last_name": "Gyökeres",
        "display_name": "Gyökeres",
    }
    assert _matches_query(player, "V. Gyökeres", "gyokeres")
    assert _matches_query(player, "V. Gyökeres", "Gyökeres")
    assert _matches_query(player, "V. Gyökeres", "viktor")
    assert _matches_query(player, "V. Gyökeres", "V. Gyokeres")


