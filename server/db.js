// server/db.js — SQLite setup + schema (node:sqlite, built into Node)
const { DatabaseSync } = require("node:sqlite");
const path = require("path");
const fs = require("fs");

const DB_PATH = process.env.DB_PATH || path.join(__dirname, "..", "popforge.db");

// ensure parent dir exists
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS widgets (
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

  CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    widget_id TEXT NOT NULL,
    data TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (widget_id) REFERENCES widgets(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_widgets_user ON widgets(user_id);
  CREATE INDEX IF NOT EXISTS idx_submissions_widget ON submissions(widget_id);
`);

// ---- Migrations for databases created before Google sign-in ----
// The base schema stays unchanged so fresh installs and old files agree.
const userColumns = db.prepare("PRAGMA table_info(users)").all().map(function (c) { return c.name; });
[
  ["token_version", "token_version INTEGER NOT NULL DEFAULT 0"],
  ["google_id", "google_id TEXT"],
  ["name", "name TEXT"],
  ["avatar_url", "avatar_url TEXT"],
  ["email_verified", "email_verified INTEGER NOT NULL DEFAULT 1"]
].forEach(function (col) {
  if (userColumns.indexOf(col[0]) === -1) db.exec("ALTER TABLE users ADD COLUMN " + col[1]);
});
// Invalidate legacy sessions on accounts that were linked before credentials were hardened.
if (!userColumns.includes("token_version")) {
  db.prepare("UPDATE users SET token_version = token_version + 1 WHERE google_id IS NOT NULL").run();
}
db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google ON users(google_id) WHERE google_id IS NOT NULL");


// Retry keys prevent duplicate leads when the first response is lost in transit.
const submissionColumns = db.prepare("PRAGMA table_info(submissions)").all().map(c => c.name);
if (!submissionColumns.includes("request_id")) db.exec("ALTER TABLE submissions ADD COLUMN request_id TEXT");
db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_submission_request ON submissions(widget_id, request_id) WHERE request_id IS NOT NULL");

db.exec("CREATE TABLE IF NOT EXISTS revoked_tokens (token_hash TEXT PRIMARY KEY, expires_at INTEGER NOT NULL)");
db.exec("CREATE INDEX IF NOT EXISTS idx_revoked_expiry ON revoked_tokens(expires_at)");

// Password resets store only a SHA-256 token hash; the raw token is emailed once.
db.exec("CREATE TABLE IF NOT EXISTS password_reset_tokens (id INTEGER PRIMARY KEY AUTOINCREMENT, token_hash TEXT NOT NULL UNIQUE, user_id INTEGER NOT NULL, email TEXT NOT NULL, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, used_at INTEGER, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)");
db.exec("CREATE INDEX IF NOT EXISTS idx_reset_tokens_user ON password_reset_tokens(user_id)");
db.exec("CREATE INDEX IF NOT EXISTS idx_reset_tokens_expiry ON password_reset_tokens(expires_at)");

// Email verification for new password accounts. Existing accounts are verified.
db.exec("CREATE TABLE IF NOT EXISTS email_verification_tokens (id INTEGER PRIMARY KEY AUTOINCREMENT, token_hash TEXT NOT NULL UNIQUE, user_id INTEGER NOT NULL, email TEXT NOT NULL, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, used_at INTEGER, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)");
db.exec("CREATE INDEX IF NOT EXISTS idx_email_verification_expiry ON email_verification_tokens(expires_at)");

// Server-side lead webhooks. URLs and signing secrets intentionally live apart
// from the public widget config, which visitors can read.
db.exec("CREATE TABLE IF NOT EXISTS webhook_endpoints (widget_id TEXT PRIMARY KEY, url TEXT NOT NULL, secret TEXT NOT NULL, enabled INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')), FOREIGN KEY (widget_id) REFERENCES widgets(id) ON DELETE CASCADE)");
db.exec("CREATE TABLE IF NOT EXISTS webhook_deliveries (id TEXT PRIMARY KEY, widget_id TEXT NOT NULL, submission_id INTEGER, event TEXT NOT NULL, test INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, response_status INTEGER, error TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), completed_at TEXT, FOREIGN KEY (widget_id) REFERENCES widgets(id) ON DELETE CASCADE)");
db.exec("CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_widget ON webhook_deliveries(widget_id)");
module.exports = db;
