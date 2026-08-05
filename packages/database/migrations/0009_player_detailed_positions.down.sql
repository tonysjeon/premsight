ALTER TABLE player_snapshot_entries
    DROP CONSTRAINT player_snapshot_entries_positions_check,
    DROP COLUMN positions;

