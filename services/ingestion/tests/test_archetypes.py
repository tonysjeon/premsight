from __future__ import annotations

from uuid import uuid4

import numpy as np

from app.services.archetypes import assign_gk_cluster_label, fit_position_clusters


def test_assign_gk_cluster_label_uses_percentile_axes() -> None:
    sweeper = assign_gk_cluster_label(np.array([80.0, 55.0, 50.0, 20.0, 40.0, 90.0, 10.0]))
    assert sweeper == "Sweeper Keeper"
    shot_stopper = assign_gk_cluster_label(np.array([20.0, 88.0, 75.0, 30.0, 40.0, 40.0, 50.0]))
    assert shot_stopper == "Shot-Stopping Specialist"


def test_fit_position_clusters_empty():
    assert fit_position_clusters([]) == []


def test_fit_position_clusters_few_players():
    pid = uuid4()
    players = [
        {"player_id": pid, "position": "FWD", "features": [80.0, 70.0, 60.0, 75.0, 30.0, 45.0]}
    ]
    results = fit_position_clusters(players)
    assert len(results) == 1
    assert results[0]["player_id"] == pid
    assert results[0]["cluster_id"] == 0
    assert "FWD" in results[0]["cluster_label"]


def test_fit_position_clusters_groups_by_position():
    players = []
    # 5 Forwards
    for i in range(5):
        players.append(
            {
                "player_id": uuid4(),
                "position": "FWD",
                "features": [70.0 + i, 60.0 + i, 50.0, 65.0, 20.0, 40.0],
            }
        )
    # 5 Defenders
    for i in range(5):
        players.append(
            {
                "player_id": uuid4(),
                "position": "DEF",
                "features": [10.0, 30.0, 40.0, 25.0, 70.0 + i, 65.0 + i],
            }
        )

    results = fit_position_clusters(players, n_clusters=2)
    assert len(results) == 10
    for r in results:
        assert isinstance(r["cluster_id"], int)
        assert isinstance(r["cluster_label"], str)
        assert len(r["cluster_label"]) > 0
