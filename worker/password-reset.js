// worker/password-reset.js — Cloudflare Workers implementation of the reset flow.
// Uses WebCrypto for token hashing and the shared PBKDF2 password hash. Only the
// SHA-256 hash of a 32-byte token is stored in D1.
const shared = require("../shared/password-reset");
const email = require("../shared/email");
const auth = require("./auth");

const { ApiError, sha256Hex, hashPassword } = auth;
const FALLBACK_ORIGIN = "https://popuploom.com";

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

function b64url(bytes) {
  let text = "";
  for (const byte of bytes) text += String.fromCharCode(byte);
  return btoa(text).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function randomToken() {
  return b64url(crypto.getRandomValues(new Uint8Array(shared.RESET_TOKEN_BYTES)));
}

function emailConfig(env) {
  return email.readConfig(env, FALLBACK_ORIGIN);
}

function requireEmailConfig(env) {
  const config = emailConfig(env);
  if (!config.configured) throw new ApiError(503, email.setupMessage(config), shared.NOT_CONFIGURED_CODE);
  return config;
}

// Returns { to, token } when a message should be sent, otherwise null.
async function forgotPassword(env, rawEmail) {
  const normalized = shared.normalizeEmail(rawEmail);
  if (!shared.isValidEmail(normalized)) throw new ApiError(400, "Enter a valid email address", "BAD_REQUEST");
  const now = nowSeconds();
  await env.DB.prepare("DELETE FROM password_reset_tokens WHERE expires_at <= ?").bind(now).run();
  const user = await env.DB.prepare("SELECT id, email, google_id FROM users WHERE email = ?").bind(normalized).first();
  if (!user || user.google_id) return null;
  const token = randomToken();
  await env.DB.prepare("UPDATE password_reset_tokens SET used_at = ? WHERE user_id = ? AND used_at IS NULL").bind(now, user.id).run();
  await env.DB.prepare("INSERT INTO password_reset_tokens (token_hash, user_id, email, created_at, expires_at) VALUES (?, ?, ?, ?, ?)")
    .bind(await sha256Hex(token), user.id, user.email, now, now + shared.RESET_TOKEN_TTL_SECONDS).run();
  return { to: user.email, token };
}

async function resetPassword(env, rawToken, newPassword) {
  const token = typeof rawToken === "string" ? rawToken : "";
  if (!shared.isResetTokenFormat(token)) throw new ApiError(400, shared.INVALID_RESET_MESSAGE, shared.INVALID_RESET_CODE);
  const passwordProblem = shared.passwordError(newPassword);
  if (passwordProblem) throw new ApiError(400, passwordProblem, shared.WEAK_PASSWORD_CODE);

  const now = nowSeconds();
  const tokenHash = await sha256Hex(token);
  const row = await env.DB.prepare("SELECT id, token_hash, user_id, expires_at, used_at FROM password_reset_tokens WHERE token_hash = ?").bind(tokenHash).first();
  if (!row || !shared.timingSafeEqual(row.token_hash, tokenHash) || row.used_at != null || row.expires_at <= now) {
    throw new ApiError(400, shared.INVALID_RESET_MESSAGE, shared.INVALID_RESET_CODE);
  }
  const consumed = await env.DB.prepare("UPDATE password_reset_tokens SET used_at = ? WHERE id = ? AND used_at IS NULL AND expires_at > ?").bind(now, row.id, now).run();
  if (!consumed.meta.changes) throw new ApiError(400, shared.INVALID_RESET_MESSAGE, shared.INVALID_RESET_CODE);

  const passwordHash = await hashPassword(newPassword);
  // Invalidating token_version revokes every existing bearer session.
  await env.DB.prepare("UPDATE users SET password_hash = ?, token_version = token_version + 1, email_verified = 1 WHERE id = ?").bind(passwordHash, row.user_id).run();
  await env.DB.prepare("UPDATE password_reset_tokens SET used_at = ? WHERE user_id = ? AND used_at IS NULL").bind(now, row.user_id).run();
  return shared.resetSuccessResponse();
}

module.exports = {
  randomToken,
  emailConfig,
  requireEmailConfig,
  forgotPassword,
  resetPassword
};
