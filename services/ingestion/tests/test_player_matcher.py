from app.services.player_matcher import match_player_candidate, normalize_string, team_tla_from_name


def test_normalize_string() -> None:
    assert normalize_string("Martin Ødegaard") == "martinodegaard"
    assert normalize_string("Erling Haaland") == "erlinghaaland"
    assert normalize_string("Bruno Fernandes") == "brunofernandes"


def test_team_tla_from_name() -> None:
    assert team_tla_from_name("Arsenal") == "ARS"
    assert team_tla_from_name("Manchester City") == "MCI"
    assert team_tla_from_name("Spurs") == "TOT"
    assert team_tla_from_name("Nottingham Forest") == "NOT"


def test_match_player_candidate_finds_exact_and_fuzzy() -> None:
    candidates = [
        {
            "id": "1",
            "first_name": "Bukayo",
            "last_name": "Saka",
            "display_name": "Saka",
            "team_tla": "ARS",
        },
        {
            "id": "2",
            "first_name": "Martin",
            "last_name": "Ødegaard",
            "display_name": "Ødegaard",
            "team_tla": "ARS",
        },
        {
            "id": "3",
            "first_name": "Cole",
            "last_name": "Palmer",
            "display_name": "Palmer",
            "team_tla": "CHE",
        },
    ]

    match1 = match_player_candidate("Bukayo Saka", "Arsenal", candidates)
    assert match1 is not None
    assert match1["id"] == "1"

    match2 = match_player_candidate("Martin Odegaard", "Arsenal", candidates)
    assert match2 is not None
    assert match2["id"] == "2"

    match3 = match_player_candidate("C. Palmer", "Chelsea", candidates)
    assert match3 is not None
    assert match3["id"] == "3"

    nomatch = match_player_candidate("Lionel Messi", "Inter Miami", candidates)
    assert nomatch is None


def test_match_player_candidate_prefers_matching_initial() -> None:
    candidates = [
        {
            "id": "silva",
            "first_name": "António",
            "last_name": "Silva",
            "display_name": "Silva",
            "team_tla": "BOU",
        },
        {
            "id": "dasilva",
            "first_name": "Jay",
            "last_name": "Dasilva",
            "display_name": "Dasilva",
            "team_tla": "COV",
        },
    ]
    match = match_player_candidate("A. Silva", "", candidates)
    assert match is not None
    assert match["id"] == "silva"


def test_match_player_candidate_initial_and_last_name() -> None:
    candidates = [
        {
            "id": "4",
            "first_name": "Emiliano",
            "last_name": "Martínez",
            "display_name": "Martínez",
            "team_tla": "AVL",
        }
    ]
    match = match_player_candidate("E. Martínez", "Aston Villa", candidates)
    assert match is not None
    assert match["id"] == "4"
