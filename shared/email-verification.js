// shared/email-verification.js — signup email-verification rules shared by both
// runtimes. Pure helpers only (no DB, crypto or network).
const VERIFY_TOKEN_BYTES = 32;               // 256 bits of CSPRNG output
const VERIFY_TOKEN_TTL_MINUTES = 60 * 24;    // 24 hours
const VERIFY_TOKEN_TTL_SECONDS = VERIFY_TOKEN_TTL_MINUTES * 60;
const VERIFY_TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;

const GENERIC_REGISTER_MESSAGE = "If that email is available, a verification link is on its way. Check your inbox and spam folder, then sign in.";
const VERIFY_SUCCESS_MESSAGE = "Email verified. You are signed in.";
const INVALID_VERIFY_MESSAGE = "This verification link is invalid or has expired. Sign in or reset your password to request a new one.";
const NOT_VERIFIED_MESSAGE = "Verify your email before signing in. Check your inbox and spam folder.";
const NOT_CONFIGURED_CODE = "EMAIL_VERIFICATION_NOT_CONFIGURED";
const INVALID_VERIFY_CODE = "INVALID_VERIFY_TOKEN";
const NOT_VERIFIED_CODE = "EMAIL_NOT_VERIFIED";

function normalizeEmail(value) {
  return String(value == null ? "" : value).trim().toLowerCase();
}

function isVerifyTokenFormat(token) {
  return typeof token === "string" && VERIFY_TOKEN_RE.test(token);
}

function buildVerifyUrl(origin, token) {
  return String(origin).replace(/\/+$/, "") + "/verify-email.html#token=" + encodeURIComponent(token);
}

module.exports = {
  VERIFY_TOKEN_BYTES,
  VERIFY_TOKEN_TTL_MINUTES,
  VERIFY_TOKEN_TTL_SECONDS,
  VERIFY_TOKEN_RE,
  GENERIC_REGISTER_MESSAGE,
  VERIFY_SUCCESS_MESSAGE,
  INVALID_VERIFY_MESSAGE,
  NOT_VERIFIED_MESSAGE,
  NOT_CONFIGURED_CODE,
  INVALID_VERIFY_CODE,
  NOT_VERIFIED_CODE,
  normalizeEmail,
  isVerifyTokenFormat,
  buildVerifyUrl
};
