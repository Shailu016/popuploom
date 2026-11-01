// worker/index.js — Workers entry: API router + CORS + static assets (port of server/index.js)
import auth from "./auth.js";
import http from "./http.js";
import widgets from "./widgets.js";
import { originCheck, securityHeaders, htmlHeaders } from "./security.js";

const { ApiError, register, login, findOrCreateGoogleUser, verifyCredential, getUserById, updateProfile, authMiddleware, revokeToken } = auth;
const { json, rateLimit } = http;

const registerLimit = rateLimit("register", 40, 10 * 60 * 1000);
const loginLimit = rateLimit("login", 40, 10 * 60 * 1000);
const googleLimit = rateLimit("google", 30, 10 * 60 * 1000);
const apiLimit = rateLimit("api", 1200, 60000);

const JSON_LIMIT = 192 * 1024;

// Explicit public allowlist, same as the Express server's static middleware.
const PUBLIC_FILES = new Set([
  "index.html", "studio.html", "profile.html", "demo.html",
  "app.js", "studio.js", "popforge.js", "ui.css"
]);

// [regex, method, handler, needsAuth]
const WIDGET_ROUTES = [
  [/^\/api\/widgets\/?$/, "GET", widgets.listWidgets, true],
  [/^\/api\/widgets\/?$/, "POST", widgets.createWidget, true],
  [/^\/api\/widgets\/([A-Za-z0-9_-]{3,64})\/config\/?$/, "GET", widgets.getWidgetConfig, false],
  [/^\/api\/widgets\/([A-Za-z0-9_-]{3,64})\/submissions\/?$/, "GET", widgets.listSubmissions, true],
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
    const { email, password, name } = c.body || {};
    const result = await register(c.env, email, password, name);
    return json(result, 201);
  } catch (e) {
    return json({ error: e.message }, e instanceof ApiError ? e.status : 400);
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

function healthRoute() {
  return json({ ok: true, version: "2.0" });
}

async function handleApi(request, env, ctx, pathname, method, cors) {
  let matched = null;
  const params = {};

  if (pathname === "/api/health" && method === "GET") {
    matched = { handler: healthRoute };
  } else if (pathname === "/api/auth/register" && method === "POST") {
    matched = { handler: registerRoute, limit: registerLimit };
  } else if (pathname === "/api/auth/login" && method === "POST") {
    matched = { handler: loginRoute, limit: loginLimit };
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
  console.error("[popforge] request failed:", e && e.message);
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
  const file = pathname === "/" ? "/index.html" : pathname;
  if (PUBLIC_FILES.has(file.slice(1))) {
    const asset = await env.ASSETS.fetch(new Request(new URL(file, request.url)));
    if (asset.status === 404) return new Response("Not found", { status: 404, headers: { ...sec, ...cors } });
    const headers = new Headers(asset.headers);
    headers.set("Cache-Control", "no-store");
    if (file.endsWith(".html")) for (const [key, value] of Object.entries(htmlHeaders(env, file.slice(1)))) headers.set(key, value);
    return new Response(headOnly ? null : asset.body, { status: asset.status, headers: { ...sec, ...cors, ...Object.fromEntries(headers) } });
  }
  if (file.startsWith("/assets/")) {
    const asset = await env.ASSETS.fetch(new Request(new URL(file, request.url)));
    // Express falls through to the SPA fallback when a static asset is missing.
    if (asset.status === 404) return serveIndex(env, request, sec, cors, headOnly);
    const headers = new Headers(asset.headers);
    headers.set("Cache-Control", "no-store");
    return new Response(headOnly ? null : asset.body, { status: asset.status, headers: { ...sec, ...cors, ...Object.fromEntries(headers) } });
  }
  // SPA-ish fallback: serve index.html for unknown routes (but not API)
  return serveIndex(env, request, sec, cors, headOnly);
}

export default {
  async fetch(request, env, ctx) {
    let pathname;
    try {
      pathname = new URL(request.url).pathname;
    } catch (e) {
      return new Response("Bad Request", { status: 400 });
    }
    const sec = securityHeaders(env, request);
    let cors;
    try {
      cors = originCheck(env, request, pathname);
    } catch (e) {
      return withHeaders(errorResponse(e), { ...sec, "Cache-Control": "no-store" });
    }
    const method = request.method;
    const headOnly = method === "HEAD";
    const effectiveMethod = headOnly ? "GET" : method;

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
