ALTER TABLE users
    DROP CONSTRAINT IF EXISTS users_avatar_url_check,
    DROP COLUMN IF EXISTS avatar_url;
