// server/password-reset.js — Express implementation of the password reset flow.
// Tokens are 32 CSPRNG bytes; only their SHA-256 hash is stored. A request for
// an unknown, Google-only or invalid account returns the same generic response.
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const db = require("./db");
const shared = require("../shared/password-reset");
const email = require("../shared/email");

class ResetError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function randomToken() {
  return crypto.randomBytes(shared.RESET_TOKEN_BYTES).toString("base64url");
}

function defaultOrigin() {
  if (process.env.PUBLIC_ORIGIN) return process.env.PUBLIC_ORIGIN;
  if (process.env.NODE_ENV === "production") return "https://popuploom.com";
  return "http://localhost:" + (process.env.PORT || 3000);
}

function emailConfig() {
  return email.readConfig(process.env, defaultOrigin());
}

function requireEmailConfig() {
  const config = emailConfig();
  if (!config.configured) throw new ResetError(503, email.setupMessage(config), shared.NOT_CONFIGURED_CODE);
  return config;
}

/**
 * Create a single-use reset token for a password account.
 * Returns { to, token } when a message should be sent, otherwise null.
 * The caller must not change its HTTP response based on this return value.
 */
function forgotPassword(rawEmail) {
  const normalized = shared.normalizeEmail(rawEmail);
  if (!shared.isValidEmail(normalized)) throw new ResetError(400, "Enter a valid email address", "BAD_REQUEST");
  const now = nowSeconds();
  db.prepare("DELETE FROM password_reset_tokens WHERE expires_at <= ?").run(now);
  const user = db.prepare("SELECT id, email, google_id FROM users WHERE email = ?").get(normalized);
  // Google-only accounts cannot use a password reset. They still receive the
  // same response, and no token or email is produced.
  if (!user || user.google_id) return null;
  const token = randomToken();
  // Prior outstanding links stop working as soon as a newer one is requested.
  db.prepare("UPDATE password_reset_tokens SET used_at = ? WHERE user_id = ? AND used_at IS NULL").run(now, user.id);
  db.prepare("INSERT INTO password_reset_tokens (token_hash, user_id, email, created_at, expires_at) VALUES (?, ?, ?, ?, ?)")
    .run(hashToken(token), user.id, user.email, now, now + shared.RESET_TOKEN_TTL_SECONDS);
  return { to: user.email, token };
}

/**
 * Consume a reset token atomically and replace the password. Every failure mode
 * (malformed, unknown, expired, already used) shares one generic error object.
 */
function resetPassword(rawToken, newPassword) {
  const token = typeof rawToken === "string" ? rawToken : "";
  if (!shared.isResetTokenFormat(token)) throw new ResetError(400, shared.INVALID_RESET_MESSAGE, shared.INVALID_RESET_CODE);
  const passwordProblem = shared.passwordError(newPassword);
  if (passwordProblem) throw new ResetError(400, passwordProblem, shared.WEAK_PASSWORD_CODE);

  const now = nowSeconds();
  const tokenHash = hashToken(token);
  const row = db.prepare("SELECT id, token_hash, user_id, expires_at, used_at FROM password_reset_tokens WHERE token_hash = ?").get(tokenHash);
  if (!row || !shared.timingSafeEqual(row.token_hash, tokenHash) || row.used_at !== null || row.expires_at <= now) {
    throw new ResetError(400, shared.INVALID_RESET_MESSAGE, shared.INVALID_RESET_CODE);
  }

  // The conditional UPDATE is the single-use gate: only one caller can flip
  // used_at from NULL to a timestamp.
  const consumed = db.prepare("UPDATE password_reset_tokens SET used_at = ? WHERE id = ? AND used_at IS NULL AND expires_at > ?").run(now, row.id, now);
  if (!consumed.changes) throw new ResetError(400, shared.INVALID_RESET_MESSAGE, shared.INVALID_RESET_CODE);

  const passwordHash = bcrypt.hashSync(newPassword, 10);
  // token_version invalidation revokes every existing bearer session.
  db.prepare("UPDATE users SET password_hash = ?, token_version = token_version + 1 WHERE id = ?").run(passwordHash, row.user_id);
  db.prepare("UPDATE password_reset_tokens SET used_at = ? WHERE user_id = ? AND used_at IS NULL").run(now, row.user_id);
  return shared.resetSuccessResponse();
}

module.exports = {
  ResetError,
  hashToken,
  randomToken,
  emailConfig,
  requireEmailConfig,
  forgotPassword,
  resetPassword
};
