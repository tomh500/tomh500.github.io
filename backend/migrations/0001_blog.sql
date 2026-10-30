CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, login TEXT NOT NULL, avatar TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires);
CREATE TABLE IF NOT EXISTS oauth_states (
  token_hash TEXT PRIMARY KEY, return_to TEXT NOT NULL, expires INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS posts (
  slug TEXT PRIMARY KEY, title TEXT NOT NULL, summary TEXT NOT NULL,
  tags TEXT NOT NULL, body TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL, published_at TEXT, published_version INTEGER
);
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY, thread TEXT NOT NULL, user_id TEXT NOT NULL REFERENCES users(id),
  body TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending'
    CHECK(status IN ('pending', 'approved', 'rejected')),
  created INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS comments_thread_status ON comments(thread, status, created);
CREATE INDEX IF NOT EXISTS comments_user_created ON comments(user_id, created);
