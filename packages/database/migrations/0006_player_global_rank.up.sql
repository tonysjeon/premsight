ALTER TABLE player_snapshot_entries
    ADD COLUMN global_rank SMALLINT
    CHECK (global_rank IS NULL OR global_rank > 0);

CREATE UNIQUE INDEX player_snapshot_entries_snapshot_global_rank_idx
    ON player_snapshot_entries (snapshot_id, global_rank)
    WHERE global_rank IS NOT NULL;
