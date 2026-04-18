CREATE TABLE IF NOT EXISTS rate_limit_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    policy TEXT NOT NULL,
    client_key TEXT NOT NULL,
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_policy_key_time
    ON rate_limit_events(policy, client_key, created_at);