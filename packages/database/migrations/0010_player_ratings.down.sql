ALTER TABLE player_snapshot_entries
    DROP CONSTRAINT player_snapshot_entries_rating_check,
    DROP COLUMN rating_model_version,
    DROP COLUMN ea_rating;
