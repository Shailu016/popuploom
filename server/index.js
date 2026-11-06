// server/index.js — Express app: API + static file serving
const fs = require("fs");
const path = require("path");

// Load .env (Node's built-in parser) before any module reads process.env.
// GOOGLE_CLIENT_ID, JWT_SECRET and PORT are all read at module load.
try {
  const envPath = path.join(__dirname, "..", ".env");
  if (fs.existsSync(envPath) && typeof process.loadEnvFile === "function") process.loadEnvFile(envPath);
} catch (e) {
  console.warn("[popforge] could not read .env:", e.message);
}

const express = require("express");
const security = require("./security");
const { register, login, findOrCreateGoogleUser, getUserById, updateProfile, authMiddleware } = require("./auth");
const { verifyCredential, isConfigured, CLIENT_ID } = require("./google");
const widgetsRouter = require("./routes/widgets");
const ads = require("../shared/ads");
const db = require("./db");
const hostPolicy = require("../shared/host-policy");
const verification = require("../shared/verification");
const passwordReset = require("./password-reset");
const sharedReset = require("../shared/password-reset");
const resetEmail = require("../shared/email");

const app = express();
const PORT = process.env.PORT || 3000;

// Permanent browser-page moves (apex canonicalization and legacy-host moves),
// plus a single-hop HTTPS upgrade when a trusted proxy reports a plaintext
// request. API/runtime/asset requests are never moved across hosts.
app.use((req, res, next) => {
  const host = req.get("host");
  const forwardedProto = String(req.get("x-forwarded-proto") || "").split(",")[0].trim().toLowerCase();
  const plaintext = forwardedProto === "http" && host
    ? hostPolicy.secureRedirect("http://" + host + req.originalUrl, process.env.DOMAIN_CUTOVER_ENABLED)
    : null;
  const target = plaintext || hostPolicy.pageRedirect(req.protocol + "://" + host + req.originalUrl, req.method, process.env.DOMAIN_CUTOVER_ENABLED);
  if (!target) return next();
  res.setHeader("Location", target);
  res.setHeader("Cache-Control", "no-store");
  res.status(308).end();
});

// Middleware
app.disable("x-powered-by");
app.use(security.headers);
app.use(security.browserOrigin);

const rateLimit = require("./limits");
// Set TRUST_PROXY to trusted proxy IPs/subnets when deploying behind a proxy.
const proxies = String(process.env.TRUST_PROXY || "").split(",").map(v => v.trim()).filter(Boolean);
app.set("trust proxy", proxies.length ? proxies : false);
app.use("/api/auth/register", rateLimit("register", 40, 10 * 60 * 1000));
app.use("/api/auth/login", rateLimit("login", 40, 10 * 60 * 1000));
app.use("/api/auth/google", rateLimit("google", 30, 10 * 60 * 1000));
// IP limits cover the reset flow; the forgot route adds a normalized-email
// limit after the body is parsed.
app.use("/api/auth/forgot-password", rateLimit("forgot-password", 20, 15 * 60 * 1000));
app.use("/api/auth/reset-password", rateLimit("reset-password", 30, 15 * 60 * 1000));
app.use("/api", (req, res, next) => { res.setHeader("Cache-Control", "no-store"); next(); });
app.use("/api", rateLimit("api", 1200, 60000));
// Reject oversized/compressed JSON after cheap origin and rate checks.
app.use(express.json({ limit: "192kb", inflate: false }));

function noStore(res) {
  res.setHeader("Cache-Control", "no-store");
}

app.post('/api/auth/account', rateLimit('account-action',10,60000), authMiddleware, async (req,res) => {
  try { res.json(await require('./auth').manageAccount(req.user.id,req.body||{})); }
  catch(e){res.status(400).json({error:e.message});}
});
// ---- Auth routes ----
app.post("/api/auth/register", (req, res) => {
  try {
    const { email, password, name } = req.body || {};
    const result = register(email, password, name);
    noStore(res);
    res.status(201).json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post("/api/auth/login", (req, res) => {
  try {
    const { email, password } = req.body || {};
    const result = login(email, password);
    noStore(res);
    res.json(result);
  } catch (e) {
    res.status(401).json({ error: e.message });
  }
});

// Request a reset link. The response is identical for known, unknown and
// Google-only accounts; delivery happens after the response is sent.
app.post("/api/auth/forgot-password", (req, res) => {
  let config;
  try {
    config = passwordReset.requireEmailConfig();
  } catch (e) {
    return res.status(e.status || 503).json({ error: e.message, code: e.code || sharedReset.NOT_CONFIGURED_CODE });
  }
  const limited = rateLimit.checkEmailLimit("forgot-password-email", 5, 15 * 60 * 1000, req.body && req.body.email);
  if (limited.limited) {
    res.setHeader("Retry-After", String(limited.retryAfter));
    return res.status(429).json({ error: "Too many requests. Try again later." });
  }
  let delivery;
  try {
    delivery = passwordReset.forgotPassword(req.body && req.body.email);
  } catch (e) {
    return res.status(e.status || 400).json({ error: e.message, code: e.code || "BAD_REQUEST" });
  }
  noStore(res);
  res.json(sharedReset.forgotResponse());
  if (delivery) {
    // Provider failures are logged without the token or address and never
    // change the already-sent response, so they cannot reveal account state.
    // Promise.resolve also converts a synchronous sender throw into a rejection.
    setImmediate(() => Promise.resolve()
      .then(() => resetEmail.sendPasswordResetEmail(config, delivery))
      .catch((e) => console.warn("[popuploom] password reset email failed:", e.message)));
  }
});

// Consume a single-use token and replace the password. Existing sessions are
// revoked through the account's token_version.
app.post("/api/auth/reset-password", (req, res) => {
  try {
    const { token, password } = req.body || {};
    const result = passwordReset.resetPassword(token, password);
    noStore(res);
    res.json(result);
  } catch (e) {
    res.status(e.status || 400).json({ error: e.message, code: e.code || "BAD_REQUEST" });
  }
});

// Revoke the current bearer token server-side; other devices stay signed in.
app.post("/api/auth/logout", authMiddleware, (req, res) => {
  const now = Math.floor(Date.now() / 1000);
  db.prepare("DELETE FROM revoked_tokens WHERE expires_at <= ?").run(now);
  db.prepare("INSERT OR REPLACE INTO revoked_tokens(token_hash, expires_at) VALUES (?, ?)").run(req.session.tokenHash, req.session.expiresAt);
  res.json({ ok: true });
});

// Tells the browser whether a Google button can be rendered at all.
app.get("/api/auth/config", (req, res) => {
  noStore(res);
  res.json({ googleClientId: isConfigured() ? CLIENT_ID : null });
});

// Exchange a Google Identity Services credential for a PopupLoom session.
app.post("/api/auth/google", async (req, res) => {
  try {
    const credential = req.body && req.body.credential;
    const profile = await verifyCredential(credential);
    const result = findOrCreateGoogleUser(profile);
    noStore(res);
    res.json(result);
  } catch (e) {
    const status = e.code === "GOOGLE_NOT_CONFIGURED" ? 503
      : e.code === "EMAIL_UNVERIFIED" ? 403
      : e.code === "BAD_REQUEST" ? 400
      : 401;
    res.status(status).json({ error: e.message, code: e.code || "AUTH_FAILED" });
  }
});

app.get("/api/auth/me", authMiddleware, (req, res) => {
  const user = getUserById(req.user.id);
  if (!user) return res.status(401).json({ error: "Account not found" });
  noStore(res);
  res.json({ user });
});

// Update the signed-in account's profile (name, avatar).
app.put("/api/auth/profile", authMiddleware, (req, res) => {
  noStore(res);
  try {
    const user = updateProfile(req.user.id, req.body || {});
    res.json({ user });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ---- Widget routes ----
app.use("/api/widgets", widgetsRouter);

// ---- Health ----
app.get("/api/health", (req, res) => res.json({ ok: true, version: "2.0" }));

// ---- Static files (frontend): explicit public allowlist ----
// Match the production build's optional authorized-seller record without
// loading advertising scripts or requiring a generated file in the source tree.
app.get('/ads.txt', (req, res, next) => {
  const publisher = String(process.env.ADSENSE_PUBLISHER_ID || '').trim();
  if (!/^pub-\d{16}$/.test(publisher)) return next();
  res.type('text/plain').send('google.com, ' + publisher + ', DIRECT, f08c47fec0942fa0\n');
});
const publicFiles = new Set([
  "templates.html", "faq.html", "press.html", "guides/install-popups.html", "guides/index.html", "guides/wordpress-popup.html", "guides/shopify-popup.html", "guides/webflow-popup.html", "guides/collect-and-export-leads.html", "guides/popup-not-showing.html", "guides/popup-builder-for-ecommerce.html", "guides/popup-builder-for-quick-commerce.html", "guides/popup-builder-for-lead-generation.html", "ccf2a9f45165c635253d22748df4a573.txt", "robots.txt", "sitemap.xml", "llms.txt", "llms-full.txt", "index.html", "studio.html", "profile.html", "demo.html", "migration.html", "reset-password.html",
  "leads.html", "privacy.html", "about.html", "contact.html", "terms.html", ".well-known/security.txt", "lead-csv.js", "leads.js", "account.js", "app.js", "studio.js", "reset-password.js", "popuploom.js", "popforge.js", "ui.css", "ads.txt"
]);
app.use((req, res, next) => {
  if (req.method !== "GET" && req.method !== "HEAD") return next();
  let pathname;
  try { pathname = decodeURIComponent(req.path); }
  catch (e) { return res.status(400).end(); }
  if (pathname === "/") pathname = "/index.html";
  if (!publicFiles.has(pathname.slice(1))) {
    // Verification drop files are served only when the owner actually placed
    // the file; a pattern-matching name with no file falls through to the same
    // hardened 404 as any other unknown path. The strict regex in
    // shared/verification.js forbids slashes and leading dots, so the join
    // below can never traverse above the project root.
    if (!verification.verificationFile(pathname.slice(1))) return next();
    let dropStat = null;
    try { dropStat = fs.statSync(path.join(__dirname, "..", pathname.slice(1))); } catch (e) {}
    if (!dropStat || !dropStat.isFile()) return next();
  }
  const file = pathname === "/popforge.js" ? "/popuploom.js" : pathname;
  res.setHeader("Cache-Control", "no-store");
  const adConfig = ads.config(process.env);
  const adNonce = file.endsWith(".html") && adConfig.enabled && ads.isAdPage(pathname) ? ads.nonce() : "";
  if (file.endsWith(".html")) {
    security.htmlHeaders(res, file.slice(1), { adsEnabled: !!adNonce, adsNonce: adNonce });
    if (file === "/migration.html" || file === "/reset-password.html" || file === "/studio.html" || file === "/profile.html" || file === "/leads.html") res.setHeader("X-Robots-Tag", "noindex, nofollow");
  }
  const diskPath = path.join(__dirname, "..", file.slice(1));
  if (!fs.existsSync(diskPath)) return next();
  if (adNonce) {
    const html = fs.readFileSync(diskPath, "utf8");
    res.type("html").send(ads.inject(html, pathname, adConfig, adNonce));
    return;
  }
  res.sendFile(diskPath);
});
app.use("/assets", express.static(path.join(__dirname, "..", "assets"), {
  dotfiles: "deny", index: false, redirect: false,
  setHeaders: res => res.setHeader("Cache-Control", "no-store")
}));

// Unknown routes are real 404s, not a soft homepage.
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  security.htmlHeaders(res);
  res.status(404).type("html").send('<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Page not found | PopupLoom</title><meta name="robots" content="noindex"></head><body style="background:#0A0B10;color:#F5F5F7;font-family:system-ui,sans-serif;padding:48px"><h1 style="font-size:28px">Page not found</h1><p style="color:#9DA0AC">That page does not exist. <a href="/" style="color:#FF6A1F">Return to PopupLoom</a>.</p></body></html>');
});

if (require.main === module) app.listen(PORT, () => {
  console.log("");
  console.log("  ⚡ PopupLoom server running");
  console.log("  → http://localhost:" + PORT);
  console.log("  → API: http://localhost:" + PORT + "/api");
  console.log("  → DB:  " + (process.env.DB_PATH || path.join(__dirname, "..", "popforge.db")));
  console.log("  → Google sign-in: " + (isConfigured() ? "enabled" : "not configured (set GOOGLE_CLIENT_ID in .env)"));
  console.log("");
});

// Keep API errors machine-readable without exposing SQL, paths, or stack traces.
app.use("/api", (req, res) => res.status(404).json({ error: "Endpoint not found" }));
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const status = err.status === 413 ? 413 : err.status === 415 ? 415 : err instanceof SyntaxError || err.status === 400 ? 400 : 500;
  if (status === 500) console.error("[popuploom] request failed:", err.message);
  res.status(status).json({ error: status === 413 ? "Request is too large" : status === 415 ? "Unsupported content encoding" : status === 400 ? "Invalid request" : "Server error" });
});
module.exports = app;
