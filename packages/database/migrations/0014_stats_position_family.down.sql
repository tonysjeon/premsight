DROP INDEX IF EXISTS player_season_stats_family_idx;

ALTER TABLE player_season_stats
    DROP COLUMN IF EXISTS position_family;
