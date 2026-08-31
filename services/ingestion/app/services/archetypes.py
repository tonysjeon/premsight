from __future__ import annotations

from typing import Any

import numpy as np
from sklearn.cluster import KMeans


def assign_outfield_cluster_label(position: str, centroid: np.ndarray) -> str:
    # If 12 features: [goals, shots, assists, kp, pass_comp, prog_pass,
    #                  prog_carry, take_ons, tackles, int, blocks, aerials]
    # If 6 features: [scoring, creation, progression, dribbling, defending, aerial]
    if len(centroid) >= 12:
        (
            goals,
            shots,
            assists,
            kp,
            pass_comp,
            prog_pass,
            prog_carry,
            take_ons,
            tackles,
            interc,
            blocks,
            aerials,
        ) = centroid[:12]
        scoring = goals * 40.0 + shots * 15.0
        creation = assists * 50.0 + kp * 25.0
        progression = prog_pass * 8.0 + prog_carry * 8.0
        dribbling = take_ons * 20.0
        defending = tackles * 12.0 + interc * 15.0 + blocks * 15.0
        aerial = aerials * 20.0
    elif len(centroid) >= 6:
        scoring, creation, progression, dribbling, defending, aerial = centroid[:6]
    else:
        return f"{position} Archetype"

    if position == "DEF":
        if progression > 40 and (creation > 30 or dribbling > 25):
            return "Attacking Full-Back"
        if dribbling > 30 or progression > 45:
            return "Carrying Wing-Back"
        if defending > 40 and aerial > 35:
            return "Traditional Stopper"
        return "Ball-Playing Defender"

    if position == "MID":
        if creation > 40 and progression > 40:
            return "Creative Playmaker"
        if defending > 40 and aerial > 30:
            return "Defensive Anchor"
        if dribbling > 35 and scoring > 25:
            return "Box-to-Box Engine"
        return "Central Controller"

    if position == "FWD":
        if scoring > 40 and aerial > 35:
            return "Target Forward / Poacher"
        if creation > 35 or dribbling > 35:
            return "Creative Inside Forward"
        if scoring > 35 and dribbling > 30:
            return "Direct Goal-Threat"
        return "Complete Forward"

    return f"{position} Archetype"


def assign_gk_cluster_label(centroid: np.ndarray) -> str:
    if len(centroid) >= 7:
        short_pct, psxg_ga, save_pct, aerials, _int_padj, _passes_cmp, long_pct = centroid[:7]
        if short_pct > 60 and long_pct < 40:
            return "Sweeper Keeper"
        if save_pct > 70 or psxg_ga > 70:
            return "Shot-Stopping Specialist"
        if aerials > 70:
            return "Commanding Keeper"
        return "Distributor"

    if len(centroid) < 6:
        return "Goalkeeper"
    # Legacy generated GK: [save_pct, saves_per90, ga_per90, cs_pct, pass_comp, launched]
    save_pct, saves_per90, ga_per90, cs_pct, pass_comp, launched = centroid[:6]

    if pass_comp > 75 and launched < 8:
        return "Sweeper Keeper"
    if cs_pct > 30 or save_pct > 72:
        return "Commanding Keeper"
    return "Shot-Stopping Specialist"


def fit_position_clusters(
    players: list[dict[str, Any]],
    n_clusters: int = 4,
    random_state: int = 42,
) -> list[dict[str, Any]]:
    """Fits KMeans clustering on player feature vectors grouped by position.

    Returns a list of dicts with player_id, cluster_id, and cluster_label.
    """
    if not players:
        return []

    # Group players by position
    groups: dict[str, list[dict[str, Any]]] = {}
    for p in players:
        pos = p.get("position", "MID")
        groups.setdefault(pos, []).append(p)

    results: list[dict[str, Any]] = []

    for pos, group in groups.items():
        k = min(n_clusters, len(group))
        if k < 2:
            # Not enough players to cluster meaningfully
            for p in group:
                results.append(
                    {
                        "player_id": p["player_id"],
                        "position_family": pos,
                        "cluster_id": 0,
                        "cluster_label": f"Primary {pos}",
                    }
                )
            continue

        X = np.array([p["features"] for p in group], dtype=float)
        kmeans = KMeans(n_clusters=k, random_state=random_state, n_init=10)
        labels = kmeans.fit_predict(X)
        centroids = kmeans.cluster_centers_

        cluster_labels: dict[int, str] = {}
        for c_id in range(k):
            centroid = centroids[c_id]
            if pos == "GK":
                cluster_labels[c_id] = assign_gk_cluster_label(centroid)
            else:
                cluster_labels[c_id] = assign_outfield_cluster_label(pos, centroid)

        for p, cluster_id in zip(group, labels):
            results.append(
                {
                    "player_id": p["player_id"],
                    "position_family": pos,
                    "cluster_id": int(cluster_id),
                    "cluster_label": cluster_labels[int(cluster_id)],
                }
            )

    return results
