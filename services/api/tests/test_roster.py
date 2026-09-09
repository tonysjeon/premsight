from app.core.roster import _roster_review, filter_team_roster


def test_review_excludes_only_matching_club_and_season() -> None:
    players = [
        {"slug": "max-alleyne", "team_tla": "MCI"},
        {"slug": "erling-haaland", "team_tla": "MCI"},
        {"slug": "max-alleyne", "team_tla": "ARS"},
        {"slug": "new-signing", "team_tla": "MCI"},
    ]
    assert filter_team_roster(players, "PL", "2026/2027") == players[1:]
    assert filter_team_roster(players, "PL", "2025/2026") == players
    assert filter_team_roster(players, "PL", "2027/2028") == players
    assert filter_team_roster(players, "OTHER", "2026/2027") == players
    assert filter_team_roster([], "PL", "2026/2027") == []


def test_review_covers_twenty_clubs_and_preserves_name_variants() -> None:
    teams = _roster_review()["teams"]
    assert len({t["team_tla"] for t in teams}) == 20
    for team in teams:
        assert team["source_url"].startswith("https://www.fotmob.com/teams/")
        assert len(set(team["excluded_player_slugs"])) == len(team["excluded_player_slugs"])
    dias = [{"slug": "ruben-dos-santos-gato-alves-dias", "team_tla": "MCI"}]
    assert filter_team_roster(dias, "PL", "2026/2027") == dias


def test_roster_facts_include_birthdays_and_preserve_missing_values() -> None:
    from datetime import date

    from app.core.roster import enrich_team_roster

    players = [{"slug": "erling-haaland", "team_tla": "MCI", "squad_number": None}]
    before = enrich_team_roster(players, "PL", "2026/2027", date(2026, 7, 19))[0]
    birthday = enrich_team_roster(players, "PL", "2026/2027", date(2026, 7, 20))[0]
    assert before["age"] == 25
    assert birthday["age"] == 26
    assert birthday["squad_number"] == 9
    assert birthday["height_inches"] == 77
    assert birthday["display_name"] == "Erling Haaland"
    assert birthday["positions"] == ["ST"]
    assert players[0]["squad_number"] is None
    assert enrich_team_roster(players, "PL", "2025/2026", date(2026, 9, 8)) == players
    assert enrich_team_roster(players, "OTHER", "2026/2027", date(2026, 9, 8)) == players
    unknown = [{"slug": "unknown", "team_tla": "MCI"}]
    assert enrich_team_roster(unknown, "PL", "2026/2027", date(2026, 9, 8)) == unknown
    nyoni = enrich_team_roster(
        [{"slug": "trey-nyoni", "team_tla": "LIV"}], "PL", "2026/2027", date(2026, 9, 8)
    )[0]
    assert nyoni["height_inches"] is None


def test_all_roster_facts_validate() -> None:
    from app.core.roster import _roster_facts

    facts = _roster_facts()
    assert len(facts.teams) == 20
    assert sum(len(t.players) for t in facts.teams) == 491
    for team in facts.teams:
        orders = [player.roster_order for player in team.players.values()]
        assert len(orders) == len(set(orders))


def test_roster_uses_reviewed_order_with_unknown_players_last() -> None:
    from datetime import date

    from app.core.roster import enrich_team_roster

    slugs = ["unknown", "erling-haaland", "marcus-bettinelli", "gianluigi-donnarumma"]
    players = [{"slug": slug, "team_tla": "MCI"} for slug in slugs]
    result = enrich_team_roster(players, "PL", "2026/2027", date(2026, 9, 9))
    assert [p["slug"] for p in result] == [
        "gianluigi-donnarumma", "marcus-bettinelli", "erling-haaland", "unknown"
    ]
    assert [p["slug"] for p in players] == slugs


def test_roster_positions_preserve_provider_labels_and_order() -> None:
    from datetime import date

    from app.core.roster import enrich_team_roster

    players = [{"slug": "rico-lewis", "team_tla": "MCI", "positions": ["RB", "CM"]}]
    result = enrich_team_roster(players, "PL", "2026/2027", date(2026, 9, 9))
    assert result[0]["positions"] == ["RB", "LB", "CM", "DM"]
    assert players[0]["positions"] == ["RB", "CM"]
    assert enrich_team_roster(players, "PL", "2025/2026", date(2026, 9, 9)) == players


def test_roster_maps_wide_midfielders_to_wingers_without_duplicates() -> None:
    from datetime import date

    from app.core.roster import enrich_team_roster

    players = [{"slug": "antoine-semenyo", "team_tla": "MCI"}]
    result = enrich_team_roster(players, "PL", "2026/2027", date(2026, 9, 9))
    assert result[0]["positions"] == ["RW", "LW", "ST"]
