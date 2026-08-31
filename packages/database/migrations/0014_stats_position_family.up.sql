ALTER TABLE player_season_stats
    ADD COLUMN position_family TEXT NOT NULL DEFAULT 'MID'
        CHECK (position_family IN ('GK', 'DEF', 'MID', 'FWD'));

CREATE INDEX player_season_stats_family_idx
    ON player_season_stats (season_id, position_family);
