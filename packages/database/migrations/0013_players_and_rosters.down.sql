DELETE FROM provider_references WHERE entity_type = 'player';

ALTER TABLE provider_references
    DROP CONSTRAINT provider_references_entity_type_check,
    ADD CONSTRAINT provider_references_entity_type_check CHECK (
        entity_type IN (
            'competition',
            'season',
            'team',
            'fixture',
            'match_event'
        )
    );

DROP TABLE IF EXISTS player_archetypes;
DROP TABLE IF EXISTS player_season_stats;
DROP TABLE IF EXISTS squad_memberships;
DROP TABLE IF EXISTS players;
