/* shared/cache-policy.js — one cache policy for the Worker and Express server.
   Public, indexable pages must be revalidated, not blocked from caches. Private
   app surfaces must never be stored. An HTML page that carries a per-request
   ad CSP nonce is kept private so a shared cache cannot replay the nonce. */
"use strict";

const PRIVATE_HTML = new Set([
  "/studio.html",
  "/profile.html",
  "/leads.html",
  "/demo.html",
  "/migration.html",
  "/reset-password.html",
  "/verify-email.html"
]);

function normalize(file) {
  const value = String(file || "");
  return "/" + value.replace(/^\/+/, "");
}

function isPrivateHtml(file) {
  return PRIVATE_HTML.has(normalize(file));
}

function cacheControlFor(file, options) {
  const path = normalize(file);
  const adsNonce = options && options.adsNonce;
  if (path.startsWith("/embed/")) return "public, max-age=31536000, immutable";
  if (isPrivateHtml(path)) return "no-store";
  if (path.endsWith(".html")) {
    // Ad pages embed a nonce that changes on every response. Shared caches must
    // not store it; browsers may keep it only until revalidation.
    return adsNonce
      ? "private, max-age=0, must-revalidate"
      : "public, max-age=0, must-revalidate";
  }
  // Crawler and agent-discovery files are safe to revalidate. Runtime scripts,
  // styles and images keep the existing no-store behaviour so a deploy cannot
  // leave an old embed or a stale preview in a browser cache.
  if (path.startsWith("/.well-known/") || /\.(?:xml|txt|json)$/i.test(path)) {
    return "public, max-age=0, must-revalidate";
  }
  return "no-store";
}

module.exports = { PRIVATE_HTML, isPrivateHtml, cacheControlFor };
