ALTER TABLE player_snapshot_entries
    ADD COLUMN nationality_code TEXT
    CHECK (nationality_code IS NULL OR nationality_code ~ '^[A-Z0-9]{2}$');
