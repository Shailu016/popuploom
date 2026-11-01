// shared/host-policy.js — one source of truth for canonical host + legacy redirects.
// Used by the Cloudflare Worker (ESM import) and the local Express server (CommonJS).
//
// Rules:
//  * The apex is the only canonical host. Only known browser pages move there.
//  * Runtime assets, the draft-recovery page, crawler files and /api/* are served
//    directly on every host so installed embeds and existing API clients never
//    cross a host boundary behind the owner's back.
//  * Unknown paths are left alone: they become real 404s instead of a redirect
//    to the homepage.
//  * localhost, 127.0.0.1 and preview hosts are never redirected off-origin.
const NEW_ORIGIN = "https://popuploom.com";
const APEX_HOSTS = new Set(["popuploom.com"]);
const WWW_HOSTS = new Set(["www.popuploom.com"]);
const LEGACY_HOSTS = new Set(["popforge.shailu3597.workers.dev"]);

// Legacy host page -> apex path. Anything not listed is not redirected.
const LEGACY_PAGES = new Map([
  ["/", "/"],
  ["/index.html", "/"],
  ["/templates.html", "/templates.html"],
  ["/guides/install-popups.html", "/guides/install-popups.html"],
  ["/studio.html", "/studio.html"],
  ["/profile.html", "/profile.html"],
  ["/demo.html", "/demo.html"]
]);

// Direct-response paths: never redirected, even on www or the legacy host.
const DIRECT_PATHS = new Set([
  "/popuploom.js",
  "/popforge.js",
  "/migration.html",
  "/robots.txt",
  "/sitemap.xml"
]);

function isDirectPath(pathname) {
  return DIRECT_PATHS.has(pathname)
    || pathname.startsWith("/api/")
    || pathname === "/api"
    || pathname.startsWith("/assets/");
}

/**
 * Returns an absolute redirect target for a browser page move, or null when the
 * request should be handled normally. `rawUrl` must be the absolute request URL.
 */
function pageRedirect(rawUrl, method, cutoverEnabled = false) {
  // Fail closed until DNS, TLS and the new application have been verified.
  const moveLegacy = cutoverEnabled === true || cutoverEnabled === "true";
  if (method !== "GET" && method !== "HEAD") return null;
  let url;
  try { url = new URL(rawUrl); } catch (e) { return null; }
  const host = url.hostname.toLowerCase();
  const pathname = url.pathname;

  // Same-origin /index.html normalization is safe on every host (including
  // localhost) and keeps one canonical URL per deployment.
  if (pathname === "/index.html") {
    if (APEX_HOSTS.has(host) || WWW_HOSTS.has(host) || (moveLegacy && LEGACY_HOSTS.has(host))) {
      return NEW_ORIGIN + "/" + url.search;
    }
    return url.origin + "/" + url.search;
  }

  if (APEX_HOSTS.has(host)) return null;
  if (isDirectPath(pathname)) return null;

  if (WWW_HOSTS.has(host)) return NEW_ORIGIN + pathname + url.search;

  if (moveLegacy && LEGACY_HOSTS.has(host)) {
    const mapped = LEGACY_PAGES.get(pathname);
    return mapped ? NEW_ORIGIN + mapped + url.search : null;
  }

  return null;
}

module.exports = { NEW_ORIGIN, APEX_HOSTS, WWW_HOSTS, LEGACY_HOSTS, LEGACY_PAGES, DIRECT_PATHS, isDirectPath, pageRedirect };
