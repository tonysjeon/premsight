-- Site accounts linked through Google sign-in.
-- Email is stored lowercase. Identities are unique per provider subject.

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    display_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT users_email_unique UNIQUE (email),
    CONSTRAINT users_email_lowercase_check CHECK (email = lower(email)),
    CONSTRAINT users_email_format_check CHECK (position('@' IN email) > 1),
    CONSTRAINT users_display_name_check CHECK (char_length(btrim(display_name)) BETWEEN 1 AND 80)
);

CREATE TABLE oauth_identities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    provider_user_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT oauth_identities_provider_check CHECK (provider IN ('google')),
    CONSTRAINT oauth_identities_provider_subject_unique UNIQUE (provider, provider_user_id)
);

CREATE INDEX oauth_identities_user_id_idx ON oauth_identities (user_id);
