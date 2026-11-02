-- PopupLoom (formerly PopForge) schema for D1 (final shape of server/db.js after its migrations)
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  token_version INTEGER NOT NULL DEFAULT 0,
  google_id TEXT,
  name TEXT,
  avatar_url TEXT
);
CREATE UNIQUE INDEX idx_users_google ON users(google_id) WHERE google_id IS NOT NULL;

CREATE TABLE widgets (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  template TEXT,
  config TEXT NOT NULL,
  view_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_widgets_user ON widgets(user_id);

-- Retry keys prevent duplicate leads when the first response is lost in transit.
CREATE TABLE submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  widget_id TEXT NOT NULL,
  data TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  request_id TEXT,
  FOREIGN KEY (widget_id) REFERENCES widgets(id) ON DELETE CASCADE
);
CREATE INDEX idx_submissions_widget ON submissions(widget_id);
CREATE UNIQUE INDEX idx_submission_request ON submissions(widget_id, request_id) WHERE request_id IS NOT NULL;

CREATE TABLE revoked_tokens (
  token_hash TEXT PRIMARY KEY,
  expires_at INTEGER NOT NULL
);
CREATE INDEX idx_revoked_expiry ON revoked_tokens(expires_at);
