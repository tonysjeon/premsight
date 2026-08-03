-- Idempotent Premier League + current season seed.
-- Season 2026/2027 aligns with the start of the PL campaign around August 2026.

INSERT INTO competitions (code, name, country_code)
VALUES ('PL', 'Premier League', 'ENG')
ON CONFLICT (code) DO UPDATE
SET
    name = EXCLUDED.name,
    country_code = EXCLUDED.country_code,
    updated_at = now();

WITH pl AS (
    SELECT id
    FROM competitions
    WHERE code = 'PL'
)
INSERT INTO seasons AS s (
    competition_id,
    name,
    start_date,
    end_date,
    is_current,
    updated_at
)
SELECT
    pl.id,
    '2026/2027',
    DATE '2026-08-14',
    DATE '2027-05-31',
    FALSE,
    now()
FROM pl
ON CONFLICT (competition_id, name) DO UPDATE
SET
    start_date = EXCLUDED.start_date,
    end_date = EXCLUDED.end_date,
    updated_at = now();

UPDATE seasons AS s
SET
    is_current = FALSE,
    updated_at = now()
FROM competitions c
WHERE
    s.competition_id = c.id
    AND c.code = 'PL'
    AND s.is_current
    AND s.name <> '2026/2027';

UPDATE seasons AS s
SET
    is_current = TRUE,
    updated_at = now()
FROM competitions c
WHERE
    s.competition_id = c.id
    AND c.code = 'PL'
    AND s.name = '2026/2027'
    AND s.is_current IS DISTINCT FROM TRUE;
