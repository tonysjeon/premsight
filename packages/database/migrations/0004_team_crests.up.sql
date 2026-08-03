ALTER TABLE teams ADD COLUMN crest_url TEXT;

ALTER TABLE teams ADD CONSTRAINT teams_crest_url_check CHECK (
    crest_url IS NULL OR crest_url ~ '^https://'
);
