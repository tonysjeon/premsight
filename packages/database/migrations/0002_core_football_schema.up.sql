-- Core football data model for PremSight.
-- See docs/03-database-schema.md.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE competitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    country_code TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT competitions_code_unique UNIQUE (code)
);

CREATE TABLE seasons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competition_id UUID NOT NULL REFERENCES competitions (id),
    name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_current BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT seasons_competition_name_unique UNIQUE (competition_id, name),
    CONSTRAINT seasons_date_range_check CHECK (end_date >= start_date)
);

CREATE UNIQUE INDEX seasons_one_current_per_competition
    ON seasons (competition_id)
    WHERE is_current;

CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    short_name TEXT,
    tla TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT teams_tla_length_check CHECK (tla IS NULL OR char_length(tla) = 3)
);

CREATE TABLE fixtures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competition_id UUID NOT NULL REFERENCES competitions (id),
    season_id UUID NOT NULL REFERENCES seasons (id),
    home_team_id UUID NOT NULL REFERENCES teams (id),
    away_team_id UUID NOT NULL REFERENCES teams (id),
    status TEXT NOT NULL,
    kickoff_at TIMESTAMPTZ NOT NULL,
    matchday INT,
    home_score INT,
    away_score INT,
    venue TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fixtures_home_away_distinct_check CHECK (home_team_id <> away_team_id),
    CONSTRAINT fixtures_status_check CHECK (
        status IN ('scheduled', 'live', 'postponed', 'cancelled', 'completed')
    ),
    CONSTRAINT fixtures_home_score_nonnegative_check CHECK (
        home_score IS NULL OR home_score >= 0
    ),
    CONSTRAINT fixtures_away_score_nonnegative_check CHECK (
        away_score IS NULL OR away_score >= 0
    )
);

CREATE INDEX fixtures_season_kickoff_idx ON fixtures (season_id, kickoff_at);
CREATE INDEX fixtures_status_idx ON fixtures (status);
CREATE INDEX fixtures_home_team_id_idx ON fixtures (home_team_id);
CREATE INDEX fixtures_away_team_id_idx ON fixtures (away_team_id);
CREATE INDEX fixtures_competition_season_idx ON fixtures (competition_id, season_id);

CREATE TABLE match_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fixture_id UUID NOT NULL REFERENCES fixtures (id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    minute INT,
    extra_minute INT,
    period TEXT,
    team_id UUID REFERENCES teams (id),
    player_name TEXT,
    related_player_name TEXT,
    detail JSONB,
    sort_key INT NOT NULL,
    occurred_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT match_events_type_check CHECK (
        event_type IN (
            'goal',
            'card',
            'substitution',
            'period_change',
            'provider_correction'
        )
    ),
    CONSTRAINT match_events_minute_nonnegative_check CHECK (
        minute IS NULL OR minute >= 0
    ),
    CONSTRAINT match_events_extra_minute_nonnegative_check CHECK (
        extra_minute IS NULL OR extra_minute >= 0
    )
);

CREATE INDEX match_events_fixture_sort_idx ON match_events (fixture_id, sort_key);
CREATE INDEX match_events_fixture_type_idx ON match_events (fixture_id, event_type);

CREATE TABLE provider_references (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    provider_entity_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT provider_references_entity_type_check CHECK (
        entity_type IN (
            'competition',
            'season',
            'team',
            'fixture',
            'match_event'
        )
    ),
    CONSTRAINT provider_references_provider_entity_unique UNIQUE (
        provider,
        entity_type,
        provider_entity_id
    ),
    CONSTRAINT provider_references_provider_internal_unique UNIQUE (
        provider,
        entity_type,
        entity_id
    )
);

CREATE INDEX provider_references_entity_lookup_idx
    ON provider_references (entity_type, entity_id);
