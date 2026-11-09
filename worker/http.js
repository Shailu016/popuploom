// worker/http.js — shared helpers: JSON responses, D1 result normalization, rate limiting
const { ApiError, sha256Hex } = require("./auth");
const shared = require("../shared/password-reset");

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...headers }
  });
}

// D1's all() returns { results } in production; miniflare has historically
// differed, so normalize both shapes here.
function rows(res) {
  return Array.isArray(res) ? res : res.results;
}

async function all(stmt) {
  return rows(await stmt.all());
}

async function ipKey(scope, request) {
  const address = request.headers.get("CF-Connecting-IP") || "local";
  return scope + ":" + await sha256Hex(address);
}

// Atomic D1 counter shared by every isolate. Throws 429 with Retry-After.
async function enforceLimit(env, key, max, windowMs) {
  const now = Date.now(), until = (Math.floor(now / windowMs) + 1) * windowMs;
  const row = await env.DB.prepare("INSERT INTO rate_limits (key, count, expires_at) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = CASE WHEN rate_limits.expires_at <= ? THEN 1 ELSE rate_limits.count + 1 END, expires_at = CASE WHEN rate_limits.expires_at <= ? THEN excluded.expires_at ELSE rate_limits.expires_at END RETURNING count, expires_at").bind(key, until, now, now).first();
  if (crypto.getRandomValues(new Uint32Array(1))[0] % 100 === 0) await env.DB.prepare("DELETE FROM rate_limits WHERE expires_at <= ?").bind(now).run();
  if (row.count > max) throw new ApiError(429, "Too many requests. Try again later.", undefined, { "Retry-After": String(Math.max(1, Math.ceil((row.expires_at - now) / 1000))) });
}

function rateLimit(scope, max, windowMs) {
  return async (request, env) => {
    await enforceLimit(env, await ipKey(scope, request), max, windowMs);
  };
}

// Normalized-email limiting. The address is hashed before it becomes a key so
// the shared counter table never stores raw email addresses.
function emailRateLimit(scope, max, windowMs) {
  return async (request, env, email) => {
    const normalized = shared.normalizeEmail(email);
    if (!shared.isValidEmail(normalized)) return;
    await enforceLimit(env, scope + ":" + await sha256Hex("email:" + normalized), max, windowMs);
  };
}

// Windowed view deduplication per (widget, visitor/IP). Uses D1 rate_limits.
// Returns true on the first view in the window so the counter is incremented,
// and false on repeats within windowMs.
// The client-supplied x-visitor-id header is deliberately ignored: it is
// attacker-controlled and would let a replay script mint a new bucket per
// request by rotating the header. Cloudflare's CF-Connecting-IP is the only
// address source here.
async function dedupeView(env, widgetId, request, windowMs = 3600000) {
  const address = request.headers.get("CF-Connecting-IP") || "local";
  const hash = await sha256Hex("dedupe:view:" + widgetId + ":" + address);
  const key = "vdedupe:" + hash;
  const now = Date.now(), until = now + windowMs;
  const row = await env.DB.prepare(
    "INSERT INTO rate_limits (key, count, expires_at) VALUES (?, 1, ?) " +
    "ON CONFLICT(key) DO UPDATE SET " +
    "count = CASE WHEN rate_limits.expires_at <= ? THEN 1 ELSE rate_limits.count + 1 END, " +
    "expires_at = CASE WHEN rate_limits.expires_at <= ? THEN excluded.expires_at ELSE rate_limits.expires_at END " +
    "RETURNING count"
  ).bind(key, until, now, now).first();
  return row.count === 1;
}

module.exports = { json, all, rateLimit, emailRateLimit, dedupeView, sha256Hex };
