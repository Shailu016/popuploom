-- F-15: email verification for new password accounts.
-- Existing rows default to verified so current users are unaffected.
ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token_hash TEXT UNIQUE NOT NULL,
  user_id INTEGER NOT NULL,
  email TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_email_verification_expiry ON email_verification_tokens(expires_at);
