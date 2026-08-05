DROP INDEX IF EXISTS player_snapshot_entries_snapshot_global_rank_idx;
ALTER TABLE player_snapshot_entries DROP COLUMN IF EXISTS global_rank;
