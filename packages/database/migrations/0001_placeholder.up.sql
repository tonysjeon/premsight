-- PremSight placeholder migration
-- Retains the bootstrap schema_meta marker from repository bootstrap.

CREATE TABLE IF NOT EXISTS schema_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO schema_meta (key, value)
VALUES ('bootstrap', 'true')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
