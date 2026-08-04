-- Immutable, curated player pools for the Draft XI simulator.
-- See docs/03-database-schema.md.

CREATE TABLE player_snapshot_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season_id UUID NOT NULL REFERENCES seasons(id),
    provider TEXT NOT NULL,
    captured_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (season_id, provider, captured_at)
);

CREATE INDEX player_snapshot_runs_season_captured_idx
    ON player_snapshot_runs (season_id, captured_at DESC);

CREATE TABLE player_snapshot_entries (
    snapshot_id UUID NOT NULL REFERENCES player_snapshot_runs(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id),
    provider_player_id TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    position TEXT NOT NULL CHECK (position IN ('GK', 'DEF', 'MID', 'FWD')),
    club_rank SMALLINT NOT NULL CHECK (club_rank BETWEEN 1 AND 18),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (snapshot_id, provider_player_id),
    UNIQUE (snapshot_id, team_id, club_rank)
);

CREATE INDEX player_snapshot_entries_snapshot_team_idx
    ON player_snapshot_entries (snapshot_id, team_id);
