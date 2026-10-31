// server/routes/widgets.js — widget CRUD + views + submissions
const express = require("express");
const db = require("../db");
const { authMiddleware } = require("../auth");

const { object, validateConfig } = require("../validation");
const rateLimit = require("../limits");
const crypto = require("crypto");
const router = express.Router();

// List current user's widgets
router.get("/", authMiddleware, (req, res) => {
  const rows = db.prepare(
    "SELECT id, name, template, config, view_count, created_at, updated_at, (SELECT COUNT(*) FROM submissions WHERE widget_id = widgets.id) AS submission_count FROM widgets WHERE user_id = ? ORDER BY updated_at DESC"
  ).all(req.user.id);
  res.json(rows.map(r => ({
    id: r.id, name: r.name, template: r.template,
    cfg: JSON.parse(r.config), viewCount: r.view_count, submissionCount: r.submission_count,
    createdAt: r.created_at, updatedAt: r.updated_at
  })));
});

// Public read-only config for the embedded runtime.
// This is what a signed-in user's install snippet fetches on their site, so
// edits in the studio go live without re-pasting. Only presentational data
// leaves the server: no owner id, no counters, no leads.
router.get("/:id/config", (req, res) => {
  const r = db.prepare("SELECT id, name, template, config, updated_at FROM widgets WHERE id = ?").get(req.params.id);
  if (!r) return res.status(404).json({ error: "Widget not found" });
  let cfg;
  try { cfg = JSON.parse(r.config); } catch (e) { return res.status(500).json({ error: "Widget config is unreadable" }); }
  if (!cfg || typeof cfg !== "object") return res.status(500).json({ error: "Widget config is unreadable" });
  cfg.id = r.id;
  if (!cfg.name) cfg.name = r.name;
  // Short shared cache: edits appear within half a minute, bursts of visitors
  // don't hammer SQLite, and stale-while-revalidate keeps embeds fast.
  res.setHeader("Cache-Control", "public, max-age=30, stale-while-revalidate=120");
  res.json({ id: r.id, name: r.name, template: r.template, cfg, updatedAt: r.updated_at });
});

// Get one widget (owner only)
router.get("/:id", authMiddleware, (req, res) => {
  const r = db.prepare(
    "SELECT id, name, template, config, view_count, created_at, updated_at FROM widgets WHERE id = ? AND user_id = ?"
  ).get(req.params.id, req.user.id);
  if (!r) return res.status(404).json({ error: "Widget not found" });
  res.json({ id: r.id, name: r.name, template: r.template, cfg: JSON.parse(r.config), viewCount: r.view_count, createdAt: r.created_at, updatedAt: r.updated_at });
});

// Create
router.post("/", authMiddleware, (req, res) => {
  const { name, template, config } = req.body || {};
  if (typeof name !== "string" || !name.trim() || name.length > 200) return res.status(400).json({ error: "name must be 1–200 characters" });
  const invalid = validateConfig(config);
  if (invalid) return res.status(400).json({ error: invalid });
  if (template != null && (typeof template !== "string" || template.length > 100)) return res.status(400).json({ error: "Invalid template" });
  // Keep the client-provided config id so the embedded runtime can report
  // views/submits against this row. Never let one user claim another's id.
  const wanted = (config && typeof config.id === "string" && /^[A-Za-z0-9_-]{3,64}$/.test(config.id)) ? config.id : null;
  const taken = wanted ? db.prepare("SELECT id FROM widgets WHERE id = ?").get(wanted) : null;
  const id = (wanted && !taken) ? wanted : ("wan_" + crypto.randomBytes(12).toString("hex"));
  config.id = id;
  db.prepare(
    "INSERT INTO widgets (id, user_id, name, template, config) VALUES (?, ?, ?, ?, ?)"
  ).run(id, req.user.id, name, template || null, JSON.stringify(config));
  res.status(201).json({ id, name, template, cfg: config, viewCount: 0 });
});

// Update (name and/or config)
router.put("/:id", authMiddleware, (req, res) => {
  const { name, config } = req.body || {};
  const r = db.prepare("SELECT id FROM widgets WHERE id = ? AND user_id = ?").get(req.params.id, req.user.id);
  if (!r) return res.status(404).json({ error: "Widget not found" });
  if (name !== undefined && (typeof name !== "string" || !name.trim() || name.length > 200)) return res.status(400).json({ error: "name must be 1–200 characters" });
  if (config !== undefined) {
    const invalid = validateConfig(config);
    if (invalid) return res.status(400).json({ error: invalid });
  }
  if (name !== undefined) db.prepare("UPDATE widgets SET name = ?, updated_at = datetime('now') WHERE id = ?").run(name, req.params.id);
  if (config !== undefined) {
    if (config && typeof config === "object") config.id = req.params.id;
    db.prepare("UPDATE widgets SET config = ?, updated_at = datetime('now') WHERE id = ?").run(JSON.stringify(config), req.params.id);
  }
  const updated = db.prepare("SELECT id, name, template, config, view_count, updated_at FROM widgets WHERE id = ?").get(req.params.id);
  res.json({ id: updated.id, name: updated.name, template: updated.template, cfg: JSON.parse(updated.config), viewCount: updated.view_count, updatedAt: updated.updated_at });
});

// Delete
router.delete("/:id", authMiddleware, (req, res) => {
  const r = db.prepare("DELETE FROM widgets WHERE id = ? AND user_id = ?").run(req.params.id, req.user.id);
  if (r.changes === 0) return res.status(404).json({ error: "Widget not found" });
  res.json({ ok: true });
});

// ---- Public events (called by the embedded runtime on third-party sites) ----

// Record a view (increments counter).
// Public, fire-and-forget telemetry from third-party pages. Unknown ids
// (demo configs, hand-written embeds, deleted widgets) are dropped silently:
// a 404 here only ever pollutes the embedder's browser console.
router.post("/:id/view", (req, res) => {
  const r = db.prepare("UPDATE widgets SET view_count = view_count + 1, updated_at = updated_at WHERE id = ?").run(req.params.id);
  if (r.changes === 0) return res.status(204).end();
  res.json({ ok: true });
});

// Record a submission (lead)
router.post("/:id/submit", rateLimit("submit", 120, 60000), (req, res) => {
  const r = db.prepare("SELECT id FROM widgets WHERE id = ?").get(req.params.id);
  if (!r) {
    // Accept with 2xx so customer pages stay console-clean, but never pretend
    // a lead landed: flag it here and in the response body. The studio's
    // "Test now" mode uses test_ ids by design, so those stay quiet.
    if (!/^test_/.test(req.params.id)) console.warn("[popforge] lead dropped — no widget with id", req.params.id);
    return res.status(202).json({ ok: false, stored: false, reason: "unknown_widget" });
  }
  const data = req.body && Object.prototype.hasOwnProperty.call(req.body, "data") ? req.body.data : (req.body || {});
  if (!object(data) || Buffer.byteLength(JSON.stringify(data)) > 16384) return res.status(400).json({ error: "Submission must be an object up to 16 KB" });
  const requestId = req.body && req.body.requestId;
  if (requestId !== undefined && (typeof requestId !== "string" || !/^[A-Za-z0-9_-]{8,100}$/.test(requestId))) return res.status(400).json({ error: "Invalid request ID" });
  db.prepare("INSERT INTO submissions (widget_id, data, request_id) VALUES (?, ?, ?) ON CONFLICT(widget_id, request_id) WHERE request_id IS NOT NULL DO NOTHING").run(req.params.id, JSON.stringify(data), requestId || null);
  res.status(201).json({ ok: true });
});

// List submissions (owner only)
router.get("/:id/submissions", authMiddleware, (req, res) => {
  const r = db.prepare("SELECT id FROM widgets WHERE id = ? AND user_id = ?").get(req.params.id, req.user.id);
  if (!r) return res.status(404).json({ error: "Widget not found" });
  const rows = db.prepare("SELECT id, data, created_at FROM submissions WHERE widget_id = ? ORDER BY created_at DESC").all(req.params.id);
  res.json(rows.map(x => ({ id: x.id, data: JSON.parse(x.data), createdAt: x.created_at })));
});

module.exports = router;
