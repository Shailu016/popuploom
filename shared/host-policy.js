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
  ["/guides/index.html", "/guides/"],
  ["/guides/", "/guides/"],
  ["/tools/index.html", "/tools/"],
  ["/tools/", "/tools/"],
  ["/guides/wordpress-popup.html", "/guides/wordpress-popup.html"],
  ["/guides/shopify-popup.html", "/guides/shopify-popup.html"],
  ["/guides/webflow-popup.html", "/guides/webflow-popup.html"],
  ["/guides/collect-and-export-leads.html", "/guides/collect-and-export-leads.html"],
  ["/guides/popup-not-showing.html", "/guides/popup-not-showing.html"],
  ["/studio.html", "/studio.html"],
  ["/profile.html", "/profile.html"],
  ["/leads.html", "/leads.html"],
  ["/privacy.html", "/privacy.html"],
  ["/demo.html", "/demo.html"]
]);

// Direct-response paths: never redirected, even on www or the legacy host.
const DIRECT_PATHS = new Set([
  "/popuploom.js",
  "/popforge.js",
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

function isMoveEnabled(cutoverEnabled) {
  return cutoverEnabled === true || cutoverEnabled === "true";
}

// Canonical browser-page rules, evaluated against an already-secure URL.
// Returns null when the request should be served where it is.
function canonicalTarget(url, moveLegacy) {
  const host = url.hostname.toLowerCase();
  const pathname = url.pathname;

  // The guides and tools hubs are linked by their directory URLs everywhere.
  // Normalize the underlying index.html in one hop on the canonical hosts and
  // the legacy host.
  if (pathname === "/guides/index.html" || pathname === "/tools/index.html") {
    if (APEX_HOSTS.has(host) || WWW_HOSTS.has(host) || (moveLegacy && LEGACY_HOSTS.has(host))) {
      return NEW_ORIGIN + pathname.replace("/index.html", "/") + url.search;
    }
    return null;
  }

  // Same-origin /index.html normalization is safe on every host (including
  // localhost) and keeps one canonical URL per deployment.
  // A hub is also typed without its trailing slash. Normalize both forms in one
  // hop so /tools and /tools/index.html never 404 or duplicate /tools/.
  if (pathname === "/guides" || pathname === "/tools") {
    if (APEX_HOSTS.has(host) || WWW_HOSTS.has(host) || (moveLegacy && LEGACY_HOSTS.has(host))) {
      return NEW_ORIGIN + pathname + "/" + url.search;
    }
    return null;
  }

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

/**
 * Returns an absolute redirect target for a browser page move, or null when the
 * request should be handled normally. `rawUrl` must be the absolute request URL.
 */
function pageRedirect(rawUrl, method, cutoverEnabled = false) {
  // Fail closed until DNS, TLS and the new application have been verified.
  const moveLegacy = isMoveEnabled(cutoverEnabled);
  if (method !== "GET" && method !== "HEAD") return null;
  let url;
  try { url = new URL(rawUrl); } catch (e) { return null; }
  return canonicalTarget(url, moveLegacy);
}

/**
 * Upgrades a plaintext request on an approved host to HTTPS in a single hop.
 * The target is computed after the canonical host rules, so e.g.
 * `http://www.popuploom.com/studio.html` goes straight to
 * `https://popuploom.com/studio.html` instead of bouncing through two redirects.
 * Localhost, 127.0.0.1 and unknown preview hosts are never redirected.
 */
function secureRedirect(rawUrl, cutoverEnabled = false) {
  let url;
  try { url = new URL(rawUrl); } catch (e) { return null; }
  if (url.protocol !== "http:") return null;
  const host = url.hostname.toLowerCase();
  if (!APEX_HOSTS.has(host) && !WWW_HOSTS.has(host) && !LEGACY_HOSTS.has(host)) return null;

  const secure = new URL(url.href);
  secure.protocol = "https:";
  const target = canonicalTarget(secure, isMoveEnabled(cutoverEnabled));
  return target || secure.href;
}

module.exports = {
  NEW_ORIGIN, APEX_HOSTS, WWW_HOSTS, LEGACY_HOSTS, LEGACY_PAGES, DIRECT_PATHS,
  isDirectPath, pageRedirect, secureRedirect
};
