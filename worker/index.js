// worker/index.js — Workers entry: API router + CORS + static assets (port of server/index.js)
import auth from "./auth.js";
import http from "./http.js";
import widgets from "./widgets.js";
import ads from "../shared/ads.js";
import passwordReset from "./password-reset.js";
import sharedReset from "../shared/password-reset.js";
import email from "../shared/email.js";
import verifyShared from "../shared/email-verification.js";
import { originCheck, securityHeaders, htmlHeaders } from "./security.js";
import hostPolicy from "../shared/host-policy.js";
import { verificationFile } from "../shared/verification.js";

const { ApiError, register, login, findOrCreateGoogleUser, verifyCredential, getUserById, updateProfile, authMiddleware, revokeToken, verifyEmail, verificationRequired } = auth;
const { json, rateLimit } = http;

const registerLimit = rateLimit("register", 40, 10 * 60 * 1000);
const registerEmailLimit = http.emailRateLimit("register-email", 5, 15 * 60 * 1000);
const accountLimit = rateLimit("account-action",10,60000);
const loginLimit = rateLimit("login", 40, 10 * 60 * 1000);
const googleLimit = rateLimit("google", 30, 10 * 60 * 1000);
const forgotLimit = rateLimit("forgot-password", 20, 15 * 60 * 1000);
const forgotEmailLimit = http.emailRateLimit("forgot-password-email", 5, 15 * 60 * 1000);
const resetLimit = rateLimit("reset-password", 30, 15 * 60 * 1000);
const verifyLimit = rateLimit("verify-email", 30, 15 * 60 * 1000);
const apiLimit = rateLimit("api", 1200, 60000);

const JSON_LIMIT = 192 * 1024;

// Cloudflare reports the scheme the visitor actually used in `cf-visitor`.
// `request.url` is normally http for plaintext requests too, but preferring the
// edge header keeps the policy correct behind any normalizing proxy.
function clientScheme(request) {
  const visitor = request.headers.get("cf-visitor");
  if (visitor) {
    try {
      const scheme = String(JSON.parse(visitor).scheme || "").toLowerCase();
      if (scheme === "http" || scheme === "https") return scheme;
    } catch (e) { /* fall through to the other signals */ }
  }
  const forwarded = request.headers.get("x-forwarded-proto");
  if (forwarded) {
    const scheme = forwarded.split(",")[0].trim().toLowerCase();
    if (scheme === "http" || scheme === "https") return scheme;
  }
  return new URL(request.url).protocol === "https:" ? "https" : "http";
}

// Explicit public allowlist, same as the Express server's static middleware.
const PUBLIC_FILES = new Set([
  "templates.html", "faq.html", "press.html", "security.html", "guides/install-popups.html", "guides/index.html", "guides/wordpress-popup.html", "guides/shopify-popup.html", "guides/webflow-popup.html", "guides/squarespace-wix-popup.html", "guides/exit-intent-popup.html", "guides/email-signup-popup.html", "guides/free-popup-builders-without-pageview-limits.html", "guides/collect-and-export-leads.html", "guides/popup-not-showing.html", "guides/popup-builder-for-ecommerce.html", "guides/popup-builder-for-quick-commerce.html", "guides/popup-builder-for-lead-generation.html", "ccf2a9f45165c635253d22748df4a573.txt", "robots.txt", "sitemap.xml", "llms.txt", "llms-full.txt", "index.html", "studio.html", "profile.html", "demo.html", "migration.html", "reset-password.html",
  "leads.html", "privacy.html", "about.html", "contact.html", "terms.html", ".well-known/security.txt", ".well-known/api-catalog", ".well-known/ard.json", ".well-known/ai-catalog.json", "openapi.json", "lead-csv.js", "leads.js", "account.js", "app.js", "studio.js", "reset-password.js", "verify-email.html", "verify-email.js", "popuploom.js", "popforge.js", "embed/1.1.0/popuploom.js", "embed/1.1.0/popforge.js", "embed/1.1.0/SHA256SUMS", "ui.css", "ads.txt"
]);

// Machine-readable discovery documents. Served with their required media
// types and a permissive CORS header so agents on other origins can read them.
const AGENT_FILES = {
  "/.well-known/api-catalog": "application/linkset+json; charset=utf-8",
  "/.well-known/ard.json": "application/json; charset=utf-8",
  "/.well-known/ai-catalog.json": "application/json; charset=utf-8",
  "/openapi.json": "application/json; charset=utf-8"
};

// [regex, method, handler, needsAuth]
const WIDGET_ROUTES = [
  [/^\/api\/widgets\/?$/, "GET", widgets.listWidgets, true],
  [/^\/api\/widgets\/?$/, "POST", widgets.createWidget, true],
  [/^\/api\/widgets\/([A-Za-z0-9_-]{3,64})\/config\/?$/, "GET", widgets.getWidgetConfig, false],
  [/^\/api\/widgets\/([A-Za-z0-9_-]{3,64})\/submissions\/?$/, "GET", widgets.listSubmissions, true],
  [/^\/api\/widgets\/([A-Za-z0-9_-]{3,64})\/webhook\/deliveries\/?$/, "GET", widgets.listWebhookDeliveries, true],
  [/^\/api\/widgets\/([A-Za-z0-9_-]{3,64})\/webhook\/test\/?$/, "POST", widgets.testWebhook, true],
  [/^\/api\/widgets\/([A-Za-z0-9_-]{3,64})\/webhook\/?$/, "GET", widgets.getWebhook, true],
  [/^\/api\/widgets\/([A-Za-z0-9_-]{3,64})\/webhook\/?$/, "PUT", widgets.putWebhook, true],
  [/^\/api\/widgets\/([A-Za-z0-9_-]{3,64})\/webhook\/?$/, "DELETE", widgets.deleteWebhook, true],
  [/^\/api\/widgets\/([A-Za-z0-9_-]{3,64})\/view\/?$/, "POST", widgets.recordView, false],
  [/^\/api\/widgets\/([A-Za-z0-9_-]{3,64})\/submit\/?$/, "POST", widgets.recordSubmit, false],
  [/^\/api\/widgets\/([A-Za-z0-9_-]{3,64})\/?$/, "GET", widgets.getWidget, true],
  [/^\/api\/widgets\/([A-Za-z0-9_-]{3,64})\/?$/, "PUT", widgets.updateWidget, true],
  [/^\/api\/widgets\/([A-Za-z0-9_-]{3,64})\/?$/, "DELETE", widgets.deleteWidget, true]
];

// Reject oversized/compressed JSON after cheap origin and rate checks,
// mirroring express.json({ limit: "192kb", inflate: false }).
async function parseJsonBody(request) {
  const contentType = request.headers.get("Content-Type") || "";
  if (!/^application\/json\b/i.test(contentType)) return {};
  const encoding = request.headers.get("Content-Encoding");
  if (encoding && !/^identity$/i.test(encoding)) throw new ApiError(415, "Unsupported content encoding");
  const declared = Number(request.headers.get("Content-Length") || 0);
  if (declared > JSON_LIMIT) throw new ApiError(413, "Request is too large");
  const reader = request.body && request.body.getReader();
  const chunks = []; let total = 0;
  if (reader) {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > JSON_LIMIT) { await reader.cancel(); throw new ApiError(413, "Request is too large"); }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
  }
  const bytes = new Uint8Array(total); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  const text = new TextDecoder().decode(bytes);
  if (new TextEncoder().encode(text).length > JSON_LIMIT) throw new ApiError(413, "Request is too large");
  if (!text) return {};
  let parsed;
  try { parsed = JSON.parse(text); } catch (e) { throw new ApiError(400, "Invalid request"); }
  if (parsed === null || typeof parsed !== "object") throw new ApiError(400, "Invalid request");
  return parsed;
}

async function registerRoute(c) {
  try {
    const { email: emailAddress, password, name } = c.body || {};
    await registerEmailLimit(c.request, c.env, emailAddress);
    // Fail closed before creating an account if the verification email cannot
    // be sent; otherwise the new user would be permanently locked out.
    let config = null;
    if (verificationRequired(c.env)) {
      config = email.readConfig(c.env, "https://popuploom.com");
      if (!config.configured) {
        return json({ error: "Signup email verification is not configured on this server." }, 503);
      }
    }
    const result = await register(c.env, emailAddress, password, name);
    if (result && result.verificationRequired) {
      // Both new and existing addresses get the same response. Email delivery
      // is best-effort: a provider failure must not reveal account existence.
      try {
        if (config && config.configured) {
          if (result.existing) await email.sendExistingAccountEmail(config, { to: result.to });
          else await email.sendVerificationEmail(config, { to: result.to, token: result.token });
        }
      } catch (e) {
        console.error("[popuploom] verification email failed:", e && e.message);
      }
      return json({ ok: true, verificationRequired: true, message: verifyShared.GENERIC_REGISTER_MESSAGE }, 201);
    }
    return json(result, 201);
  } catch (e) {
    return json({ error: e.message }, e instanceof ApiError ? e.status : 400);
  }
}

async function verifyEmailRoute(c) {
  try {
    const token = c.body && c.body.token;
    return json(await verifyEmail(c.env, token));
  } catch (e) {
    return json({ error: e.message, code: e.code }, e instanceof ApiError ? e.status : 400);
  }
}

async function loginRoute(c) {
  try {
    const { email, password } = c.body || {};
    const result = await login(c.env, email, password);
    return json(result);
  } catch (e) {
    return json({ error: e.message }, e instanceof ApiError ? e.status : 401);
  }
}

// The response never depends on whether the account exists. Delivery runs
// after the response through ctx.waitUntil so timing and failures stay generic.
async function forgotRoute(c) {
  try {
    const config = passwordReset.requireEmailConfig(c.env);
    await forgotEmailLimit(c.request, c.env, c.body && c.body.email);
    const delivery = await passwordReset.forgotPassword(c.env, c.body && c.body.email);
    if (delivery) {
      const sending = Promise.resolve()
        .then(() => email.sendPasswordResetEmail(config, delivery))
        .catch((e) => console.error("[popuploom] password reset email failed:", e.message));
      if (c.ctx && typeof c.ctx.waitUntil === "function") c.ctx.waitUntil(sending);
    }
    return json(sharedReset.forgotResponse());
  } catch (e) {
    if (e instanceof ApiError) return json({ error: e.message, code: e.code }, e.status);
    throw e;
  }
}

async function resetRoute(c) {
  try {
    return json(await passwordReset.resetPassword(c.env, c.body && c.body.token, c.body && c.body.password));
  } catch (e) {
    if (e instanceof ApiError) return json({ error: e.message, code: e.code }, e.status);
    throw e;
  }
}

async function logoutRoute(c) {
  await revokeToken(c.env, c.session);
  return json({ ok: true });
}

// Tells the browser whether a Google button can be rendered at all.
function configRoute(c) {
  return json({ googleClientId: String(c.env.GOOGLE_CLIENT_ID || "").trim() || null });
}

async function googleRoute(c) {
  try {
    const credential = c.body && c.body.credential;
    const profile = await verifyCredential(c.env, credential);
    const result = await findOrCreateGoogleUser(c.env, profile);
    return json(result);
  } catch (e) {
    const status = e.code === "GOOGLE_NOT_CONFIGURED" ? 503
      : e.code === "EMAIL_UNVERIFIED" ? 403
      : e.code === "BAD_REQUEST" ? 400
      : (e instanceof ApiError ? e.status : 401);
    return json({ error: e.message, code: e.code || "AUTH_FAILED" }, status);
  }
}

async function meRoute(c) {
  const user = await getUserById(c.env, c.user.id);
  if (!user) throw new ApiError(401, "Account not found");
  return json({ user });
}

async function profileRoute(c) {
  try {
    const user = await updateProfile(c.env, c.user.id, c.body || {});
    return json({ user });
  } catch (e) {
    return json({ error: e.message }, e instanceof ApiError ? e.status : 400);
  }
}

async function accountRoute(c) {
  try { return json(await auth.manageAccount(c.env,c.user.id,c.body||{})); }
  catch(e){return json({error:e.message},400);}
}
function healthRoute() {
  return json({ ok: true, version: "2.0" });
}

async function handleApi(request, env, ctx, pathname, method, cors) {
  let matched = null;
  const params = {};

  if (pathname === "/api/auth/account" && method === "POST") {
    matched = {handler: accountRoute, needsAuth:true, limit:accountLimit};
  } else if (pathname === "/api/health" && method === "GET") {
    matched = { handler: healthRoute };
  } else if (pathname === "/api/auth/register" && method === "POST") {
    matched = { handler: registerRoute, limit: registerLimit };
  } else if (pathname === "/api/auth/login" && method === "POST") {
    matched = { handler: loginRoute, limit: loginLimit };
  } else if (pathname === "/api/auth/forgot-password" && method === "POST") {
    matched = { handler: forgotRoute, limit: forgotLimit };
  } else if (pathname === "/api/auth/reset-password" && method === "POST") {
    matched = { handler: resetRoute, limit: resetLimit };
  } else if (pathname === "/api/auth/verify-email" && method === "POST") {
    matched = { handler: verifyEmailRoute, limit: verifyLimit };
  } else if (pathname === "/api/auth/logout" && method === "POST") {
    matched = { handler: logoutRoute, needsAuth: true };
  } else if (pathname === "/api/auth/config" && method === "GET") {
    matched = { handler: configRoute };
  } else if (pathname === "/api/auth/google" && method === "POST") {
    matched = { handler: googleRoute, limit: googleLimit };
  } else if (pathname === "/api/auth/me" && method === "GET") {
    matched = { handler: meRoute, needsAuth: true };
  } else if (pathname === "/api/auth/profile" && method === "PUT") {
    matched = { handler: profileRoute, needsAuth: true };
  } else {
    for (const [re, m, handler, needsAuth] of WIDGET_ROUTES) {
      if (method !== m) continue;
      const mm = pathname.match(re);
      if (mm) {
        matched = { handler, needsAuth };
        if (mm[1] !== undefined) params.id = mm[1];
        break;
      }
    }
  }

  if (!matched) return json({ error: "Endpoint not found" }, 404);
  if (matched.limit) await matched.limit(request, env);
  await apiLimit(request, env);
  const body = await parseJsonBody(request);
  const query = {};
  for (const key of ["limit", "before"]) {
    const value = new URL(request.url).searchParams.get(key);
    if (value !== null) query[key] = value;
  }
  const c = { env, request, params, query, body, user: null, ctx };
  if (matched.needsAuth) {
    c.session = await authMiddleware(env, request);
    c.user = c.session.user;
  }
  const res = await matched.handler(c);
  return withHeaders(res, { ...cors, "Cache-Control": "no-store" });
}

// Keep API errors machine-readable without exposing SQL, paths, or stack traces.
function errorResponse(e) {
  if (e instanceof ApiError) return json({ error: e.message }, e.status, e.headers || {});
  console.error("[popuploom] request failed:", e && e.message);
  return json({ error: "Server error" }, 500);
}

function withHeaders(res, extra) {
  const headers = new Headers(res.headers);
  for (const [key, value] of Object.entries(extra)) if (!headers.has(key)) headers.set(key, value);
  return new Response(res.body, { status: res.status, headers });
}

function stripBody(res) {
  return new Response(null, { status: res.status, headers: res.headers });
}

async function serveIndex(env, request, sec, cors, headOnly) {
  const asset = await env.ASSETS.fetch(new Request(new URL("/index.html", request.url)));
  const headers = new Headers(asset.headers);
  for (const [key, value] of Object.entries(htmlHeaders(env, "index.html"))) headers.set(key, value);
  return new Response(headOnly ? null : asset.body, { status: asset.status, headers: { ...sec, ...cors, ...Object.fromEntries(headers) } });
}

async function serveStatic(request, env, pathname, sec, cors, headOnly) {
  let file = pathname === "/" ? "/index.html" : pathname;
  // Directory URLs ending in a slash resolve to their allowlisted index page,
  // so /guides/ is a real page instead of a soft 404.
  if (file.endsWith("/") && PUBLIC_FILES.has((file + "index.html").slice(1))) file += "index.html";
  if (PUBLIC_FILES.has(file.slice(1))) {
    const asset = await env.ASSETS.fetch(new Request(new URL(file, request.url)));
    if (asset.status === 404) return new Response("Not found", { status: 404, headers: { ...sec, ...cors } });
    const headers = new Headers(asset.headers);
    headers.set("Cache-Control", file.startsWith("/embed/") ? "public, max-age=31536000, immutable" : "no-store");
    if (AGENT_FILES[file]) {
      headers.set("Content-Type", AGENT_FILES[file]);
    }
    if (["/leads.html", "/studio.html", "/profile.html", "/demo.html", "/migration.html", "/reset-password.html", "/verify-email.html"].includes(file)) headers.set("X-Robots-Tag", ["/migration.html", "/reset-password.html", "/verify-email.html", "/studio.html", "/profile.html", "/leads.html"].includes(file) ? "noindex, nofollow" : "noindex, follow");
    const adConfig = ads.config(env);
    const adNonce = file.endsWith(".html") && adConfig.enabled && ads.isAdPage(file) ? ads.nonce() : "";
    if (file.endsWith(".html")) for (const [key, value] of Object.entries(htmlHeaders(env, file.slice(1), { adsEnabled: !!adNonce, adsNonce: adNonce }))) headers.set(key, value);
    if (adNonce) {
      const html = await asset.text();
      return new Response(headOnly ? null : ads.inject(html, file, adConfig, adNonce), { status: asset.status, headers: { ...sec, ...cors, ...Object.fromEntries(headers) } });
    }
    return new Response(headOnly ? null : asset.body, { status: asset.status, headers: { ...sec, ...cors, ...Object.fromEntries(headers) } });
  }
  if (file.startsWith("/assets/")) {
    const asset = await env.ASSETS.fetch(new Request(new URL(file, request.url)));
    // Express falls through to the SPA fallback when a static asset is missing.
    if (asset.status === 404) return new Response("Not found", {status:404,headers:{...sec,...cors,"X-Robots-Tag":"noindex"}});
    const headers = new Headers(asset.headers);
    headers.set("Cache-Control", "no-store");
    return new Response(headOnly ? null : asset.body, { status: asset.status, headers: { ...sec, ...cors, ...Object.fromEntries(headers) } });
  }
  // Search Console / Bing verification drop files. The strict name pattern
  // (shared/verification.js) means traversal and lookalike paths stay 404.
  if (verificationFile(file.slice(1))) {
    const asset = await env.ASSETS.fetch(new Request(new URL(file, request.url)));
    if (asset.status !== 404) {
      const headers = new Headers(asset.headers);
      headers.set("Cache-Control", "no-store");
      return new Response(headOnly ? null : asset.body, { status: asset.status, headers: { ...sec, ...cors, ...Object.fromEntries(headers) } });
    }
  }
  // Unknown paths are real 404s, never a soft homepage. Apply the same
  // HTML hardening as every other page so an error response cannot be framed
  // or used as a weaker CSP context.
  return new Response(headOnly ? null : `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Page not found | PopupLoom</title><meta name="robots" content="noindex"></head><body style="background:#0A0B10;color:#F5F5F7;font-family:system-ui,sans-serif;padding:48px"><h1 style="font-size:28px">Page not found</h1><p style="color:#9DA0AC">That page does not exist. <a href="/" style="color:#FF6A1F">Return to PopupLoom</a>.</p></body></html>`, {status:404,headers:{...sec,...cors,...htmlHeaders(env,"404"),"Content-Type":"text/html; charset=utf-8","X-Robots-Tag":"noindex"}});
}

export default {
  async fetch(request, env, ctx) {
    let url;
    try {
      url = new URL(request.url);
    } catch (e) {
      return new Response("Bad Request", { status: 400 });
    }
    const pathname = url.pathname;
    const scheme = clientScheme(request);
    // Normalize the effective URL to the scheme the visitor used. This keeps
    // canonical redirects single-hop even when a proxy reports the original
    // scheme separately from the URL it forwards.
    if (url.protocol !== scheme + ":") url.protocol = scheme + ":";
    const canonicalUrl = url.href;

    const sec = securityHeaders(env, request);
    let cors = {};
    let corsError = null;
    try {
      cors = originCheck(env, request, pathname);
    } catch (e) {
      // A plaintext request must still reach HTTPS. Origin policy is enforced
      // on the HTTPS target, so do not turn the upgrade into a 403.
      corsError = e;
    }
    const method = request.method;
    const headOnly = method === "HEAD";
    const effectiveMethod = headOnly ? "GET" : method;

    // Plaintext requests on approved hosts are upgraded in one hop. Browser
    // pages additionally move to the apex; API calls, runtime files, assets
    // and the recovery page stay on their current host.
    const redirect = scheme === "http"
      ? (hostPolicy.secureRedirect(canonicalUrl, env.DOMAIN_CUTOVER_ENABLED)
        || hostPolicy.pageRedirect(canonicalUrl, method, env.DOMAIN_CUTOVER_ENABLED))
      : hostPolicy.pageRedirect(canonicalUrl, method, env.DOMAIN_CUTOVER_ENABLED);
    if (redirect) {
      return new Response(null, {
        status: 308,
        headers: { ...sec, ...cors, Location: redirect, "Cache-Control": "no-store" }
      });
    }
    if (corsError) {
      return withHeaders(errorResponse(corsError), { ...sec, "Cache-Control": "no-store" });
    }

    if (method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          ...sec, ...cors,
          "Access-Control-Allow-Methods": "GET, HEAD, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization"
        }
      });
    }

    if (pathname.startsWith("/api/")) {
      let res;
      try {
        res = await handleApi(request, env, ctx, pathname, effectiveMethod, cors);
      } catch (e) {
        res = errorResponse(e);
      }
      res = withHeaders(res, { ...sec, ...cors, "Cache-Control": "no-store" });
      return headOnly ? stripBody(res) : res;
    }

    if (method === "GET" || method === "HEAD") {
      return serveStatic(request, env, pathname, sec, cors, headOnly);
    }
    return new Response("Not found", { status: 404, headers: { ...sec, ...cors } });
  }
};
