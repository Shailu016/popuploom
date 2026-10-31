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
  ["avatar_url", "avatar_url TEXT"]
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

module.exports = db;
