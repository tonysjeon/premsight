ALTER TABLE player_snapshot_entries
    ADD COLUMN ea_rating SMALLINT,
    ADD COLUMN rating_model_version TEXT,
    ADD CONSTRAINT player_snapshot_entries_rating_check CHECK (
        (ea_rating IS NULL AND rating_model_version IS NULL)
        OR (
            ea_rating BETWEEN 1 AND 99
            AND rating_model_version <> ''
        )
    );
