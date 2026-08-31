-- Durable players, squad memberships (rosters), season stats feature store, and archetypes.

CREATE TABLE players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    nationality_code TEXT CHECK (nationality_code IS NULL OR nationality_code ~ '^[A-Z0-9]{2}$'),
    photo_url TEXT,
    slug TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX players_display_name_idx ON players (display_name);

CREATE TABLE squad_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season_id UUID NOT NULL REFERENCES seasons (id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES players (id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams (id) ON DELETE CASCADE,
    position TEXT NOT NULL CHECK (position IN ('GK', 'DEF', 'MID', 'FWD')),
    positions TEXT[] NOT NULL DEFAULT '{}' CHECK (
        cardinality(positions) > 0
        AND positions <@ ARRAY[
            'GK', 'DEF', 'MID', 'FWD',
            'LB', 'LWB', 'CB', 'RB', 'RWB',
            'CDM', 'CM', 'CAM', 'LM', 'RM',
            'LW', 'RW', 'CF', 'ST'
        ]::TEXT[]
    ),
    squad_number SMALLINT CHECK (squad_number IS NULL OR (squad_number >= 1 AND squad_number <= 99)),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT squad_memberships_season_player_unique UNIQUE (season_id, player_id)
);

CREATE INDEX squad_memberships_season_team_idx ON squad_memberships (season_id, team_id);
CREATE INDEX squad_memberships_player_idx ON squad_memberships (player_id);

CREATE TABLE player_season_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES players (id) ON DELETE CASCADE,
    season_id UUID NOT NULL REFERENCES seasons (id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    model_version TEXT NOT NULL,
    minutes INT NOT NULL DEFAULT 0 CHECK (minutes >= 0),
    stats JSONB NOT NULL DEFAULT '{}'::jsonb,
    features REAL[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT player_season_stats_unique UNIQUE (player_id, season_id, provider, model_version)
);

CREATE INDEX player_season_stats_season_model_idx ON player_season_stats (season_id, model_version);
CREATE INDEX player_season_stats_player_idx ON player_season_stats (player_id);

CREATE TABLE player_archetypes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES players (id) ON DELETE CASCADE,
    season_id UUID NOT NULL REFERENCES seasons (id) ON DELETE CASCADE,
    model_version TEXT NOT NULL,
    position_family TEXT NOT NULL CHECK (position_family IN ('GK', 'DEF', 'MID', 'FWD')),
    cluster_id INT NOT NULL,
    cluster_label TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT player_archetypes_unique UNIQUE (player_id, season_id, model_version)
);

CREATE INDEX player_archetypes_season_model_idx ON player_archetypes (season_id, model_version);

ALTER TABLE provider_references
    DROP CONSTRAINT provider_references_entity_type_check,
    ADD CONSTRAINT provider_references_entity_type_check CHECK (
        entity_type IN (
            'competition',
            'season',
            'team',
            'fixture',
            'match_event',
            'player'
        )
    );
