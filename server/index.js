// server/index.js — Express app: API + static file serving
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// Load .env (Node's built-in parser) before any module reads process.env.
// GOOGLE_CLIENT_ID, JWT_SECRET and PORT are all read at module load.
try {
  const envPath = path.join(__dirname, "..", ".env");
  if (fs.existsSync(envPath) && typeof process.loadEnvFile === "function") process.loadEnvFile(envPath);
} catch (e) {
  console.warn("[popuploom] could not read .env:", e.message);
}

const express = require("express");
const security = require("./security");
const { register, login, findOrCreateGoogleUser, getUserById, updateProfile, authMiddleware, verifyEmail, resendVerification, verificationRequired } = require("./auth");
const { verifyCredential, isConfigured, CLIENT_ID } = require("./google");
const widgetsRouter = require("./routes/widgets");
const ads = require("../shared/ads");
const email = require("../shared/email");
const verifyShared = require("../shared/email-verification");
const db = require("./db");
const hostPolicy = require("../shared/host-policy");
const markdown = require("../shared/markdown");
const cachePolicy = require("../shared/cache-policy");
const verification = require("../shared/verification");
const passwordReset = require("./password-reset");
const sharedReset = require("../shared/password-reset");
const resetEmail = require("../shared/email");

const app = express();
const PORT = process.env.PORT || 3000;

// Permanent browser-page moves (www to apex canonicalization),
// plus a single-hop HTTPS upgrade when a trusted proxy reports a plaintext
// request. API/runtime/asset requests are never moved across hosts.
app.use((req, res, next) => {
  const host = req.get("host");
  const forwardedProto = String(req.get("x-forwarded-proto") || "").split(",")[0].trim().toLowerCase();
  const plaintext = forwardedProto === "http" && host
    ? hostPolicy.secureRedirect("http://" + host + req.originalUrl)
    : null;
  const target = plaintext || hostPolicy.pageRedirect(req.protocol + "://" + host + req.originalUrl, req.method);
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
app.use("/api/auth/verify-email", rateLimit("verify-email", 30, 15 * 60 * 1000));
app.use("/api/auth/resend-verification", rateLimit("resend-verification", 20, 15 * 60 * 1000));
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
app.post("/api/auth/register", async (req, res) => {
  try {
    const { email: rawEmail, password, name } = req.body || {};
    const limited = rateLimit.checkEmailLimit("register-email", 5, 15 * 60 * 1000, rawEmail);
    if (limited.limited) return res.status(429).json({ error: "Too many requests. Try again later.", code: "RATE_LIMITED" });
    let config = null;
    if (verificationRequired()) {
      config = email.readConfig(process.env, process.env.PUBLIC_ORIGIN || ("http://localhost:" + (process.env.PORT || 3000)));
      if (!config.configured) return res.status(503).json({ error: "Signup email verification is not configured on this server." });
    }
    const result = register(rawEmail, password, name);
    if (result && result.verificationRequired) {
      try {
        if (config && config.configured) {
          if (result.existing) await email.sendExistingAccountEmail(config, { to: result.to });
          else await email.sendVerificationEmail(config, { to: result.to, token: result.token });
        }
      } catch (e) {
        console.error("[popuploom] verification email failed:", e && e.message);
      }
      noStore(res);
      return res.status(201).json({ ok: true, verificationRequired: true, message: verifyShared.GENERIC_REGISTER_MESSAGE });
    }
    noStore(res);
    res.status(201).json(result);
  } catch (e) {
    res.status(e.status || 400).json({ error: e.message, code: e.code });
  }
});

app.post("/api/auth/verify-email", (req, res) => {
  try {
    const token = req.body && req.body.token;
    const result = verifyEmail(token);
    noStore(res);
    res.json(result);
  } catch (e) {
    res.status(e.status || 400).json({ error: e.message, code: e.code || verifyShared.INVALID_VERIFY_CODE });
  }
});

// Same answer for unknown, verified and unverified addresses. Only an
// unverified address receives mail.
app.post("/api/auth/resend-verification", async (req, res) => {
  try {
    const emailAddress = req.body && req.body.email;
    const limited = rateLimit.checkEmailLimit("resend-verification-email", 5, 15 * 60 * 1000, emailAddress);
    if (limited.limited) return res.status(429).json({ error: "Too many requests. Try again later.", code: "RATE_LIMITED" });
    let config = null;
    if (verificationRequired()) {
      config = email.readConfig(process.env, process.env.PUBLIC_ORIGIN || ("http://localhost:" + (process.env.PORT || 3000)));
      if (!config.configured) return res.status(503).json({ error: email.setupMessage(config), code: verifyShared.NOT_CONFIGURED_CODE });
    }
    try {
      if (config && config.configured) {
        const result = resendVerification(emailAddress);
        if (result) await email.sendVerificationEmail(config, { to: result.to, token: result.token });
      }
    } catch (e) {
      console.error("[popuploom] verification resend failed:", e && e.message);
    }
    noStore(res);
    res.json({ ok: true, message: verifyShared.GENERIC_RESEND_MESSAGE });
  } catch (e) {
    res.status(400).json({ error: "Could not send the verification email." });
  }
});

app.post("/api/auth/login", (req, res) => {
  try {
    const { email, password } = req.body || {};
    const result = login(email, password);
    noStore(res);
    res.json(result);
  } catch (e) {
    res.status(e.status || 401).json({ error: e.message, code: e.code });
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
  "templates.html", "faq.html", "press.html", "security.html", "guides/install-popups.html", "guides/index.html", "guides/wordpress-popup.html", "guides/shopify-popup.html", "guides/webflow-popup.html", "guides/squarespace-wix-popup.html", "guides/exit-intent-popup.html", "guides/email-signup-popup.html", "guides/free-popup-builders-without-pageview-limits.html", "guides/collect-and-export-leads.html", "guides/popup-not-showing.html", "guides/popup-builder-for-ecommerce.html", "guides/popup-builder-for-quick-commerce.html", "guides/popup-builder-for-lead-generation.html", "guides/nextjs-popup.html", "guides/react-popup.html", "guides/astro-popup.html", "guides/google-tag-manager-popup.html", "guides/static-html-popup.html", "guides/bigcommerce-popup.html", "ccf2a9f45165c635253d22748df4a573.txt", "robots.txt", "sitemap.xml", "llms.txt", "llms-full.txt", "index.html", "studio.html", "profile.html", "demo.html", "migration.html", "reset-password.html",
  "leads.html", "privacy.html", "about.html", "contact.html", "terms.html", ".well-known/security.txt", "security.txt", ".well-known/api-catalog", ".well-known/ard.json", ".well-known/ai-catalog.json", "openapi.json", "lead-csv.js", "leads.js", "account.js", "app.js", "studio.js", "reset-password.js", "verify-email.html", "verify-email.js", "popuploom.js", "embed/1.1.0/popuploom.js", "embed/1.1.0/SHA256SUMS", "embed/1.2.0/popuploom.js", "embed/1.2.0/SHA256SUMS", "ui.css", "ads.txt",
  "templates/email-signup.html", "templates/discount.html", "templates/exit-intent.html", "templates/announcements.html", "templates/engagement.html", "templates/social-proof.html", "templates/age-gates.html", "templates/gamified.html", "templates/seasonal.html", "templates/video.html",
  "free-popup-builder-no-limits.html", "best-free-popup-builder.html", "guides/wordpress-popup-without-plugin.html",
  "templates/exit-intent-popup.html", "templates/discount-popup.html", "templates/email-signup-popup.html", "templates/spin-to-win-popup.html",
  "templates/cart-rescue-popup.html", "templates/announcement-bar.html", "templates/back-in-stock-popup.html", "templates/black-friday-popup.html",
  "templates/age-verification-popup.html", "templates/free-shipping-bar.html",
  "templates/video-popup.html", "templates/feedback-popup.html", "templates/referral-popup.html",
  "templates/trust-badge-popup.html", "templates/giveaway-popup.html", "templates/shipping-notice-popup.html",
  "tools/index.html", "tools/popup-roi-calculator.html", "tools/popup-copy-swipe-file.html", "tools/exit-intent-code-generator.html", "tools/popup-copy-generator.html",
  "tools/roi-calculator.js", "tools/copy-swipe.js", "tools/exit-intent-generator.js", "tools/popup-copy-generator.js", "tools/popup-copy-swipe-file.txt"
]);
// Private/app surfaces stay HTML-only for markdown negotiation.
const noMarkdown = new Set([
  "/studio.html", "/profile.html", "/leads.html", "/reset-password.html",
  "/verify-email.html", "/migration.html"
]);
// Named competitor pages were retired on 2026-11-16. Each old URL 301s to the
// surviving explanation of free-tier limits so no indexed link dead-ends.
const retiredPages = new Map([
  ["/alternatives/optinmonster.html", "/free-popup-builder-no-limits.html"],
  ["/alternatives/poptin.html", "/free-popup-builder-no-limits.html"],
  ["/alternatives/popupsmart.html", "/free-popup-builder-no-limits.html"],
  ["/alternatives/optimonk.html", "/free-popup-builder-no-limits.html"],
  ["/alternatives/popup-maker.html", "/free-popup-builder-no-limits.html"]
]);
app.use((req, res, next) => {
  if (req.method !== "GET" && req.method !== "HEAD") return next();
  let pathname;
  try { pathname = decodeURIComponent(req.path); }
  catch (e) { return res.status(400).end(); }
  // Keep one canonical URL per hub. The pretty URL is what every navigation
  // link uses and what the sitemap advertises.
  if (pathname === "/guides/index.html" || pathname === "/tools/index.html") {
    return res.redirect(301, pathname.replace("/index.html", "/"));
  }
  // A hub typed without its trailing slash goes to the directory URL, not a 404.
  if (pathname === "/guides" || pathname === "/tools") return res.redirect(301, pathname + "/");
  // /templates/ is the parent of every template page and the URL people type;
  // the gallery itself lives at /templates.html. One hop, query preserved.
  if (pathname === "/templates" || pathname === "/templates/" || pathname === "/templates/index.html") {
    const qs = req.originalUrl.indexOf("?") === -1 ? "" : req.originalUrl.slice(req.originalUrl.indexOf("?"));
    return res.redirect(301, "/templates.html" + qs);
  }
  // Retired named-comparison pages: send indexed URLs to the surviving page on
  // the same topic in one hop instead of letting them fall through to a 404.
  if (retiredPages.has(pathname)) return res.redirect(301, retiredPages.get(pathname));
  if (pathname === "/") pathname = "/index.html";
  // Directory URLs ending in a slash resolve to their allowlisted index page,
  // so /guides/ is a real page instead of a soft 404.
  if (pathname.endsWith("/") && publicFiles.has((pathname + "index.html").slice(1))) pathname += "index.html";
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
  const verificationDrop = !publicFiles.has(pathname.slice(1)) && verification.verificationFile(pathname.slice(1));
  const file = pathname;
  const agentTypes = {
    "/.well-known/api-catalog": "application/linkset+json; charset=utf-8",
    "/.well-known/ard.json": "application/json; charset=utf-8",
    "/.well-known/ai-catalog.json": "application/json; charset=utf-8",
    "/openapi.json": "application/json; charset=utf-8"
  };
  if (agentTypes[file]) {
    res.setHeader("Content-Type", agentTypes[file]);
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
  const adConfig = ads.config(process.env);
  ads.warnIfDisabled(adConfig);
  const adNonce = file.endsWith(".html") && adConfig.enabled && ads.isAdPage(pathname) ? ads.nonce() : "";
  if (file.endsWith(".html")) {
    security.htmlHeaders(res, file.slice(1), { adsEnabled: !!adNonce, adsNonce: adNonce });
    if (verificationDrop) res.setHeader("Cache-Control", "no-store");
    if (file === "/migration.html" || file === "/reset-password.html" || file === "/verify-email.html" || file === "/studio.html" || file === "/profile.html" || file === "/leads.html") res.setHeader("X-Robots-Tag", "noindex, nofollow");
  } else {
    res.setHeader("Cache-Control", verificationDrop ? "no-store" : cachePolicy.cacheControlFor(file));
  }
  // The immutable embed path is materialised by the Cloudflare build. The
  // Express runtime serves the same bytes from the canonical source file.
  // Each published version maps to its own frozen source; 1.2.0 is the current runtime.
  const embedSources = { "1.1.0": "/embed-releases/1.1.0/popuploom.js", "1.2.0": "/popuploom.js" };
  const embedMatch = /^\/embed\/(\d+\.\d+\.\d+)\/(popuploom\.js|SHA256SUMS)$/.exec(file);
  if (embedMatch && embedSources[embedMatch[1]] && embedMatch[2] === "SHA256SUMS") {
    const bytes = fs.readFileSync(path.join(__dirname, "..", embedSources[embedMatch[1]].slice(1)), "utf8").replace(/\r\n/g, "\n");
    const digest = crypto.createHash("sha256").update(bytes).digest("hex");
    return res.type("text/plain").send(digest + "  popuploom.js\n");
  }
  const sourceFile = (embedMatch && embedSources[embedMatch[1]]) ? embedSources[embedMatch[1]] : (file === "/security.txt" ? "/.well-known/security.txt" : file);
  const diskPath = path.join(__dirname, "..", sourceFile.slice(1));
  if (!fs.existsSync(diskPath)) return next();
  if (file.endsWith(".html") && !noMarkdown.has(file) && /\btext\/markdown\b/i.test(req.get("Accept") || "")) {
    const html = fs.readFileSync(diskPath, "utf8");
    res.setHeader("Vary", "Accept");
    // A content-negotiated representation is generated per request; do not let
    // a shared cache serve markdown to a browser that asked for HTML.
    res.setHeader("Cache-Control", "no-store");
    res.type("text/markdown").send(markdown.fromHtml(html, { url: "https://popuploom.com" + file }));
    return;
  }
  if (adNonce) {
    const html = fs.readFileSync(diskPath, "utf8");
    res.type("html").send(ads.inject(html, pathname, adConfig, adNonce));
    return;
  }
  // Express sendFile defaults to its own Cache-Control; keep the policy above.
  res.sendFile(diskPath, { dotfiles: "allow", cacheControl: false });
});
app.use("/assets", express.static(path.join(__dirname, "..", "assets"), {
  dotfiles: "deny", index: false, redirect: false,
  setHeaders: (res, filePath) => res.setHeader("Cache-Control", /[\\/]fonts[\\/][^\\/]+\.woff2$/.test(filePath) ? "public, max-age=31536000, immutable" : "no-store")
}));

// Unknown routes are real 404s, not a soft homepage. Express 5 no longer
// accepts a bare "*" path; use terminal middleware and keep the method check.
app.use((req, res, next) => {
  if (req.method !== "GET" && req.method !== "HEAD") return next();
  if (req.path.startsWith("/api/")) return next();
  security.htmlHeaders(res);
  res.status(404).type("html").send('<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Page not found | PopupLoom</title><meta name="robots" content="noindex"></head><body style="background:#0A0B10;color:#F5F5F7;font-family:system-ui,sans-serif;padding:48px"><h1 style="font-size:28px">Page not found</h1><p style="color:#9DA0AC">That page does not exist. <a href="/" style="color:#FF6A1F">Return to PopupLoom</a>.</p></body></html>');
});

if (require.main === module) app.listen(PORT, () => {
  console.log("");
  console.log("  ⚡ PopupLoom server running");
  console.log("  → http://localhost:" + PORT);
  console.log("  → API: http://localhost:" + PORT + "/api");
  console.log("  → DB:  " + (process.env.DB_PATH || path.join(__dirname, "..", "popuploom.db")));
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
