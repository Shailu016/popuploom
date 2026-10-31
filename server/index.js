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
const cors = require("cors");
const { register, login, findOrCreateGoogleUser, getUserById, updateProfile, authMiddleware } = require("./auth");
const { verifyCredential, isConfigured, CLIENT_ID } = require("./google");
const widgetsRouter = require("./routes/widgets");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({ origin: true, credentials: false }));
app.use(express.json({ limit: "2mb" }));

const rateLimit = require("./limits");
// Set TRUST_PROXY to trusted proxy IPs/subnets when deploying behind a proxy.
const proxies = String(process.env.TRUST_PROXY || "").split(",").map(v => v.trim()).filter(Boolean);
app.set("trust proxy", proxies.length ? proxies : false);
app.use("/api/auth/register", rateLimit("register", 40, 10 * 60 * 1000));
app.use("/api/auth/login", rateLimit("login", 40, 10 * 60 * 1000));
app.use("/api/auth/google", rateLimit("google", 30, 10 * 60 * 1000));
app.use("/api", (req, res, next) => { res.setHeader("Cache-Control", "no-store"); next(); });
app.use((req, res, next) => { res.setHeader("X-Content-Type-Options", "nosniff"); next(); });

function noStore(res) {
  res.setHeader("Cache-Control", "no-store");
}

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

// Tells the browser whether a Google button can be rendered at all.
app.get("/api/auth/config", (req, res) => {
  noStore(res);
  res.json({ googleClientId: isConfigured() ? CLIENT_ID : null });
});

// Exchange a Google Identity Services credential for a PopForge session.
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
const publicFiles = new Set([
  "index.html", "studio.html", "profile.html", "demo.html",
  "app.js", "studio.js", "popforge.js", "ui.css"
]);
app.use((req, res, next) => {
  if (req.method !== "GET" && req.method !== "HEAD") return next();
  let pathname;
  try { pathname = decodeURIComponent(req.path); }
  catch (e) { return res.status(400).end(); }
  if (pathname === "/") pathname = "/index.html";
  if (!publicFiles.has(pathname.slice(1))) return next();
  res.setHeader("Cache-Control", "no-store");
  res.sendFile(path.join(__dirname, "..", pathname.slice(1)));
});
app.use("/assets", express.static(path.join(__dirname, "..", "assets"), {
  dotfiles: "deny", index: false, redirect: false,
  setHeaders: res => res.setHeader("Cache-Control", "no-store")
}));

// SPA-ish fallback: serve index.html for unknown routes (but not API)
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  res.sendFile(path.join(__dirname, "..", "index.html"));
});

if (require.main === module) app.listen(PORT, () => {
  console.log("");
  console.log("  ⚡ PopForge server running");
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
  const status = err.status === 413 ? 413 : err instanceof SyntaxError || err.status === 400 ? 400 : 500;
  if (status === 500) console.error("[popforge] request failed:", err.message);
  res.status(status).json({ error: status === 413 ? "Request is too large" : status === 400 ? "Invalid request" : "Server error" });
});
module.exports = app;
