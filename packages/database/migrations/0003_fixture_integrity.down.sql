ALTER TABLE fixtures
DROP CONSTRAINT fixtures_completed_score_check;

ALTER TABLE fixtures
DROP CONSTRAINT fixtures_season_competition_fkey;

ALTER TABLE fixtures
ADD CONSTRAINT fixtures_season_id_fkey
FOREIGN KEY (season_id)
REFERENCES seasons (id);

ALTER TABLE seasons
DROP CONSTRAINT seasons_id_competition_unique;
