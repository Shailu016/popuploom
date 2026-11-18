// shared/host-policy.js — one source of truth for the canonical host.
// Used by the Cloudflare Worker (ESM import) and the local Express server (CommonJS).
//
// Rules:
//  * The apex is the only canonical host. www moves to it in one hop.
//  * Runtime assets, crawler files and /api/* are served directly on every host
//    so installed embeds and API clients never cross a host boundary behind the
//    owner's back.
//  * Unknown paths are left alone: they become real 404s instead of a redirect
//    to the homepage.
//  * localhost, 127.0.0.1 and preview hosts are never redirected off-origin.
const NEW_ORIGIN = "https://popuploom.com";
const APEX_HOSTS = new Set(["popuploom.com"]);
const WWW_HOSTS = new Set(["www.popuploom.com"]);

// Direct-response paths: never redirected, even on www.
const DIRECT_PATHS = new Set([
  "/popuploom.js",
  "/migration.html",
  // The reset link carries its token in the URL fragment. Serving the page on
  // the host from the email avoids any redirect and therefore any fragment loss.
  "/reset-password.html",
  "/robots.txt",
  "/sitemap.xml"
]);

function isDirectPath(pathname) {
  return DIRECT_PATHS.has(pathname)
    || pathname.startsWith("/api/")
    || pathname === "/api"
    || pathname.startsWith("/assets/");
}

// Canonical browser-page rules, evaluated against an already-secure URL.
// Returns null when the request should be served where it is.
function canonicalTarget(url) {
  const host = url.hostname.toLowerCase();
  const pathname = url.pathname;
  const canonicalHost = APEX_HOSTS.has(host) || WWW_HOSTS.has(host);

  // The guides and tools hubs are linked by their directory URLs everywhere.
  // Normalize the underlying index.html in one hop on the canonical hosts.
  if (pathname === "/guides/index.html" || pathname === "/tools/index.html") {
    return canonicalHost ? NEW_ORIGIN + pathname.replace("/index.html", "/") + url.search : null;
  }

  // A hub is also typed without its trailing slash. Normalize both forms in one
  // hop so /tools and /tools/index.html never 404 or duplicate /tools/.
  if (pathname === "/guides" || pathname === "/tools") {
    return canonicalHost ? NEW_ORIGIN + pathname + "/" + url.search : null;
  }

  // Same-origin /index.html normalization is safe on every host (including
  // localhost) and keeps one canonical URL per deployment.
  if (pathname === "/index.html") {
    return canonicalHost ? NEW_ORIGIN + "/" + url.search : url.origin + "/" + url.search;
  }

  if (APEX_HOSTS.has(host)) return null;
  if (isDirectPath(pathname)) return null;
  if (WWW_HOSTS.has(host)) return NEW_ORIGIN + pathname + url.search;
  return null;
}

/**
 * Returns an absolute redirect target for a browser page move, or null when the
 * request should be handled normally. `rawUrl` must be the absolute request URL.
 */
function pageRedirect(rawUrl, method) {
  if (method !== "GET" && method !== "HEAD") return null;
  let url;
  try { url = new URL(rawUrl); } catch (e) { return null; }
  return canonicalTarget(url);
}

/**
 * Upgrades a plaintext request on an approved host to HTTPS in a single hop.
 * The target is computed after the canonical host rules, so e.g.
 * `http://www.popuploom.com/studio.html` goes straight to
 * `https://popuploom.com/studio.html` instead of bouncing through two redirects.
 * Localhost, 127.0.0.1 and unknown preview hosts are never redirected.
 */
function secureRedirect(rawUrl) {
  let url;
  try { url = new URL(rawUrl); } catch (e) { return null; }
  if (url.protocol !== "http:") return null;
  const host = url.hostname.toLowerCase();
  if (!APEX_HOSTS.has(host) && !WWW_HOSTS.has(host)) return null;

  const secure = new URL(url.href);
  secure.protocol = "https:";
  return canonicalTarget(secure) || secure.href;
}

module.exports = {
  NEW_ORIGIN, APEX_HOSTS, WWW_HOSTS, DIRECT_PATHS,
  isDirectPath, pageRedirect, secureRedirect
};
