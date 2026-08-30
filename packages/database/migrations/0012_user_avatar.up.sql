-- Google profile photo for the signed-in account.

ALTER TABLE users
    ADD COLUMN avatar_url TEXT,
    ADD CONSTRAINT users_avatar_url_check CHECK (
        avatar_url IS NULL
        OR (
            avatar_url LIKE 'https://%'
            AND char_length(avatar_url) BETWEEN 12 AND 500
        )
    );
