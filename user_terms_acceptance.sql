-- Recommended schema for enforceable legal acceptance tracking.
CREATE TABLE IF NOT EXISTS user_terms_acceptance (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    terms_version TEXT NOT NULL,
    privacy_version TEXT NOT NULL,
    accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address INET NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_terms_acceptance_user_id
    ON user_terms_acceptance (user_id);

CREATE INDEX IF NOT EXISTS idx_user_terms_acceptance_accepted_at
    ON user_terms_acceptance (accepted_at DESC);
