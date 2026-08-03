-- Strengthen cross-table and completed-fixture integrity.

ALTER TABLE seasons
ADD CONSTRAINT seasons_id_competition_unique UNIQUE (id, competition_id);

ALTER TABLE fixtures
DROP CONSTRAINT fixtures_season_id_fkey;

ALTER TABLE fixtures
ADD CONSTRAINT fixtures_season_competition_fkey
FOREIGN KEY (season_id, competition_id)
REFERENCES seasons (id, competition_id);

ALTER TABLE fixtures
ADD CONSTRAINT fixtures_completed_score_check CHECK (
    status <> 'completed'
    OR (home_score IS NOT NULL AND away_score IS NOT NULL)
);
