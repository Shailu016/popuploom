const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const cors = require("cors");
const ads = require("../shared/ads");
const origins = String(process.env.APP_ORIGINS || "").split(",").filter(Boolean).map(value => {
  const url = new URL(value.trim());
  if (!["https:", "http:"].includes(url.protocol)) throw new Error("APP_ORIGINS must contain HTTP(S) origins");
  return url.origin;
});
function browserOrigin(req, res, next) {
  const origin = req.get("Origin");
  const own = req.protocol + "://" + req.get("host");
  const publicRoute = !/^\/api(?:\/|$)/i.test(req.path) || /^\/api\/widgets\/[A-Za-z0-9_-]{3,64}\/(config|view|submit)\/?$/.test(req.path) || req.path === "/api/health";
  if (origin && !publicRoute && origin !== own && !origins.includes(origin)) return res.status(403).json({ error: "Origin is not allowed" });
  cors({ origin: publicRoute ? "*" : origin || false, credentials: false, methods: ["GET", "HEAD", "POST", "PUT", "DELETE", "OPTIONS"], allowedHeaders: ["Content-Type", "Authorization"] })(req, res, next);
}
const htmlFiles = new Set(["index.html", "studio.html", "profile.html", "demo.html", "templates.html", "guides/install-popups.html", "guides/index.html", "guides/wordpress-popup.html", "guides/shopify-popup.html", "guides/webflow-popup.html", "guides/collect-and-export-leads.html", "guides/popup-not-showing.html", "migration.html", "reset-password.html", "leads.html", "privacy.html", "about.html", "contact.html", "terms.html"]);
const policyCache = new Map();
const hash = text => "'sha256-" + crypto.createHash("sha256").update(text).digest("base64") + "'";
function scriptHashes(file) {
  // Only first-party pages are exact-declared; unknown HTML (owner verification
  // drop files, future additions) gets the same base policy with no inline
  // script authority, exactly like the Worker's hashes[file] || "" fallback.
  if (!htmlFiles.has(file)) return "";
  const location = path.join(__dirname, "..", file), stat = fs.statSync(location);
  const cache = policyCache.get(file);
  if (cache && cache.mtime === stat.mtimeMs && cache.size === stat.size) return cache.hashes;
  const html = fs.readFileSync(location, "utf8").replace(/\r\n?/g, "\n"), hashes = new Set();
  for (const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) if (match[1].trim()) hashes.add(hash(match[1]));
  for (const match of html.matchAll(/\bon[a-z]+\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)) hashes.add(hash(match[1] === undefined ? match[2] : match[1]));
  const result = [...hashes].join(" ");
  policyCache.set(file, { mtime: stat.mtimeMs, size: stat.size, hashes: result });
  return result;
}
const policy = [
  "default-src 'self'", "base-uri 'none'", "object-src 'none'", "frame-ancestors 'none'", "form-action 'self'",
  "script-src 'self' 'unsafe-hashes' https://accounts.google.com/gsi/ https://static.cloudflareinsights.com SCRIPT_HASHES",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com/gsi/",
  "font-src 'self' https://fonts.gstatic.com", "img-src 'self' https: http: data:",
  "connect-src 'self' https://accounts.google.com/gsi/ https://cloudflareinsights.com " + origins.join(" "),
  "frame-src https://accounts.google.com/gsi/ https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com"
].join("; ");
function headers(req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  if (process.env.NODE_ENV === "production" && req.secure) res.setHeader("Strict-Transport-Security", "max-age=31536000");
  next();
}
function htmlHeaders(res, file = "index.html", options = {}) {
  let contentPolicy = policy.replace("SCRIPT_HASHES", scriptHashes(file));
  if (options.adsEnabled && options.adsNonce) {
    const additions = ads.cspAdditions(options.adsNonce);
    contentPolicy = contentPolicy
      .replace("script-src ", "script-src " + additions.script + " ")
      .replace("frame-src ", "frame-src " + additions.frame + " ")
      .replace("connect-src ", "connect-src " + additions.connect + " ");
  }
  res.setHeader("Content-Security-Policy", contentPolicy);
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Cache-Control", "no-store");
}
module.exports = { browserOrigin, headers, htmlHeaders };
