// worker/security.js — CORS/origin allowlist + security headers (port of server/security.js)
import auth from "./auth.js";
import hashes from "./csp-hashes.json";
import ads from "../shared/ads.js";

const { ApiError } = auth;

const PUBLIC_API_REGEX = /^\/api\/widgets\/[A-Za-z0-9_-]{3,64}\/(config|view|submit)\/?$/;

// Throws 403 when a browser origin is not allowed on a non-public route,
// otherwise returns the Access-Control-Allow-Origin headers to apply.
export function originCheck(env, request, pathname) {
  const origin = request.headers.get("Origin");
  const own = new URL(request.url).origin;
  const allowed = String(env.APP_ORIGINS || "").split(",").map(v => v.trim()).filter(Boolean);
  const publicRoute = !/^\/api(?:\/|$)/i.test(pathname) || PUBLIC_API_REGEX.test(pathname) || pathname === "/api/health";
  if (origin && !publicRoute && origin !== own && !allowed.includes(origin)) throw new ApiError(403, "Origin is not allowed");
  const headers = {};
  const allowOrigin = publicRoute ? "*" : (origin || "");
  if (allowOrigin) {
    headers["Access-Control-Allow-Origin"] = allowOrigin;
    if (allowOrigin !== "*") headers["Vary"] = "Origin";
  }
  return headers;
}

export function securityHeaders(env, request) {
  const headers = {
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin"
  };
  // Only send HSTS over https, so local dev (http) never gets it.
  if (new URL(request.url).protocol === "https:") {
    headers["Strict-Transport-Security"] = "max-age=31536000";
  }
  return headers;
}

export function htmlHeaders(env, file = "index.html", options = {}) {
  const origins = String(env.APP_ORIGINS || "").split(",").map(v => v.trim()).filter(Boolean);
  let policy = [
    "default-src 'self'", "base-uri 'none'", "object-src 'none'", "frame-ancestors 'none'", "form-action 'self'",
    "script-src 'self' 'unsafe-hashes' https://accounts.google.com/gsi/ https://static.cloudflareinsights.com " + (hashes[file] || ""),
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com/gsi/",
    "font-src 'self' https://fonts.gstatic.com", "img-src 'self' https: http: data:",
    "connect-src 'self' https://accounts.google.com/gsi/ https://cloudflareinsights.com " + origins.join(" "),
    "frame-src https://accounts.google.com/gsi/ https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com"
  ].join("; ");
  if (options.adsEnabled && options.adsNonce) {
    const additions = ads.cspAdditions(options.adsNonce);
    policy = policy
      .replace("script-src ", "script-src " + additions.script + " ")
      .replace("frame-src ", "frame-src " + additions.frame + " ")
      .replace("connect-src ", "connect-src " + additions.connect + " ");
  }
  return {
    "Content-Security-Policy": policy,
    "X-Frame-Options": "DENY",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Cache-Control": "no-store"
  };
}
