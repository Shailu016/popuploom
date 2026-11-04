// shared/password-reset.js — pure password-reset rules shared by Express and the Worker.
// No database, crypto or network access here so both runtimes (and tests) agree on
// token shape, password policy and user-facing wording.
const RESET_TOKEN_BYTES = 32;          // 256 bits of CSPRNG output
const RESET_TOKEN_TTL_MINUTES = 30;
const RESET_TOKEN_TTL_SECONDS = RESET_TOKEN_TTL_MINUTES * 60;
// base64url of 32 bytes = 43 characters, no padding.
const RESET_TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;
const MIN_PASSWORD_LENGTH = 12;
const MAX_PASSWORD_BYTES = 72;
const MAX_EMAIL_LENGTH = 254;

const GENERIC_FORGOT_MESSAGE = "If an account exists for that email, a reset link is on its way. Check your inbox and spam folder. The link expires in " + RESET_TOKEN_TTL_MINUTES + " minutes.";
const INVALID_RESET_MESSAGE = "This password reset link is invalid or has expired. Request a new one.";
const RESET_SUCCESS_MESSAGE = "Your password has been reset. Sign in with your new password.";
const NOT_CONFIGURED_CODE = "RESET_EMAIL_NOT_CONFIGURED";
const INVALID_RESET_CODE = "INVALID_RESET_TOKEN";
const WEAK_PASSWORD_CODE = "WEAK_PASSWORD";

function normalizeEmail(value) {
  return String(value == null ? "" : value).trim().toLowerCase();
}

function isValidEmail(email) {
  return typeof email === "string" && email.length <= MAX_EMAIL_LENGTH
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isResetTokenFormat(token) {
  return typeof token === "string" && RESET_TOKEN_RE.test(token);
}

function passwordError(password) {
  if (typeof password !== "string" || !password) return "Enter a new password";
  if (password.length < MIN_PASSWORD_LENGTH) return "Password must be at least " + MIN_PASSWORD_LENGTH + " characters";
  if (new TextEncoder().encode(password).length > MAX_PASSWORD_BYTES) return "Password must be at most " + MAX_PASSWORD_BYTES + " UTF-8 bytes";
  return null;
}

// Length-independent-ish constant-time string comparison for equal-length
// ASCII values (hex digests). A length mismatch is rejected immediately; the
// length of a SHA-256 hex digest is not a secret.
function timingSafeEqual(a, b) {
  a = String(a == null ? "" : a);
  b = String(b == null ? "" : b);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function forgotResponse() {
  return { ok: true, message: GENERIC_FORGOT_MESSAGE };
}

function resetSuccessResponse() {
  return { ok: true, message: RESET_SUCCESS_MESSAGE };
}

function invalidResetError() {
  return { error: INVALID_RESET_MESSAGE, code: INVALID_RESET_CODE };
}

module.exports = {
  RESET_TOKEN_BYTES,
  RESET_TOKEN_TTL_MINUTES,
  RESET_TOKEN_TTL_SECONDS,
  RESET_TOKEN_RE,
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_BYTES,
  MAX_EMAIL_LENGTH,
  GENERIC_FORGOT_MESSAGE,
  INVALID_RESET_MESSAGE,
  RESET_SUCCESS_MESSAGE,
  NOT_CONFIGURED_CODE,
  INVALID_RESET_CODE,
  WEAK_PASSWORD_CODE,
  normalizeEmail,
  isValidEmail,
  isResetTokenFormat,
  passwordError,
  timingSafeEqual,
  forgotResponse,
  resetSuccessResponse,
  invalidResetError
};
