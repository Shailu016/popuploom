// worker/http.js — shared helpers: JSON responses, D1 result normalization, rate limiting
const { ApiError } = require("./auth");

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

// Bounded counters; the visitor IP comes from Cloudflare's header.
function rateLimit(scope, max, windowMs) {
  return async (request, env) => {
    const now = Date.now(), until = (Math.floor(now / windowMs) + 1) * windowMs;
    const address = request.headers.get("CF-Connecting-IP") || "local";
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(address));
    const ip = [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
    const key = scope + ":" + ip;
    const row = await env.DB.prepare("INSERT INTO rate_limits (key, count, expires_at) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = CASE WHEN rate_limits.expires_at <= ? THEN 1 ELSE rate_limits.count + 1 END, expires_at = CASE WHEN rate_limits.expires_at <= ? THEN excluded.expires_at ELSE rate_limits.expires_at END RETURNING count, expires_at").bind(key, until, now, now).first();
    if (crypto.getRandomValues(new Uint32Array(1))[0] % 100 === 0) await env.DB.prepare("DELETE FROM rate_limits WHERE expires_at <= ?").bind(now).run();
    if (row.count > max) throw new ApiError(429, "Too many requests. Try again later.", undefined, { "Retry-After": String(Math.max(1, Math.ceil((row.expires_at - now) / 1000))) });
  };
}

module.exports = { json, all, rateLimit };
