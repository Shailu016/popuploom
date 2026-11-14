// server/routes/widgets.js — widget CRUD + views + submissions
const express = require("express");
const db = require("../db");
const { authMiddleware } = require("../auth");

const { object, validateConfig, validateShape } = require("../validation");
const rateLimit = require("../limits");
const webhook = require("../../shared/webhook");
const crypto = require("crypto");
const dns = require("node:dns").promises;
const router = express.Router();

function allowInsecureWebhooks() {
  return process.env.ALLOW_INSECURE_WEBHOOKS === "true";
}

function webhookOptions() {
  return {
    allowInsecure: allowInsecureWebhooks(),
    resolve: async function (host) {
      const rows = await dns.lookup(host, { all: true, verbatim: true });
      return rows.map(function (row) { return row.address; });
    }
  };
}

function ownedWidget(req) {
  return db.prepare("SELECT id, name FROM widgets WHERE id = ? AND user_id = ?").get(req.params.id, req.user.id);
}

function webhookJson(row) {
  if (!row) return null;
  return {
    url: row.url,
    secret: row.secret,
    enabled: !!row.enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function trimDeliveries(widgetId) {
  db.prepare("DELETE FROM webhook_deliveries WHERE widget_id = ? AND rowid NOT IN (SELECT rowid FROM webhook_deliveries WHERE widget_id = ? ORDER BY rowid DESC LIMIT 100)").run(widgetId, widgetId);
}

// A delivery is visible while it is still in flight, so a crash leaves a
// `pending` row instead of no row at all. Stale pending rows are swept on the
// next delivery for the same widget.
function logDeliveryStart(widgetId, event, submissionId) {
  try {
    db.prepare("DELETE FROM webhook_deliveries WHERE widget_id = ? AND status = 'pending' AND created_at < datetime('now','-1 day')").run(widgetId);
    db.prepare("INSERT OR IGNORE INTO webhook_deliveries (id, widget_id, submission_id, event, test, status, attempts, completed_at) VALUES (?, ?, ?, ?, ?, 'pending', 0, NULL)")
      .run(event.id, widgetId, submissionId || null, event.event, event.test ? 1 : 0);
    trimDeliveries(widgetId);
  } catch (e) {
    console.error("[popuploom] could not start webhook delivery log:", e.message);
  }
}

function logDelivery(widgetId, event, submissionId, result) {
  try {
    const updated = db.prepare("UPDATE webhook_deliveries SET status = ?, attempts = ?, response_status = ?, error = ?, completed_at = datetime('now') WHERE id = ?")
      .run(result.ok ? "success" : "failed", result.attempts || 0, result.status || null, result.error ? String(result.error).slice(0, 500) : null, event.id);
    if (!updated.changes) {
      db.prepare("INSERT INTO webhook_deliveries (id, widget_id, submission_id, event, test, status, attempts, response_status, error, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))")
        .run(event.id, widgetId, submissionId || null, event.event, event.test ? 1 : 0, result.ok ? "success" : "failed", result.attempts || 0, result.status || null, result.error ? String(result.error).slice(0, 500) : null);
    }
    trimDeliveries(widgetId);
  } catch (e) {
    console.error("[popuploom] could not record webhook delivery:", e.message);
  }
}

// Fire-and-forget after a lead is stored. The visitor response is never held
// up by a slow endpoint, and duplicate request IDs do not deliver twice.
function dispatchLead(widgetId, submissionId, data) {
  let endpoint, widget;
  try {
    widget = db.prepare("SELECT id, name FROM widgets WHERE id = ?").get(widgetId);
    endpoint = db.prepare("SELECT url, secret FROM webhook_endpoints WHERE widget_id = ? AND enabled = 1").get(widgetId);
  } catch (e) {
    return;
  }
  if (!widget || !endpoint) return;
  const event = webhook.payload(widget, { id: submissionId, createdAt: new Date().toISOString(), data: data }, { id: webhook.randomId() });
  logDeliveryStart(widgetId, event, submissionId);
  webhook.deliver(endpoint, event, webhookOptions()).then(function (result) {
    logDelivery(widgetId, event, submissionId, result);
  }, function () {});
}

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
  // The database id is always server-generated. Honouring a client-chosen id
  // would let a new account reclaim the id of a deleted widget, so an embed
  // left on a customer site would silently start serving someone else's popup.
  const id = "wan_" + crypto.randomBytes(12).toString("hex");
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
  // Clean up lead and webhook state even if foreign-key cascades are unavailable.
  db.prepare("DELETE FROM submissions WHERE widget_id = ?").run(req.params.id);
  db.prepare("DELETE FROM webhook_deliveries WHERE widget_id = ?").run(req.params.id);
  db.prepare("DELETE FROM webhook_endpoints WHERE widget_id = ?").run(req.params.id);
  res.json({ ok: true });
});

// ---- Lead webhooks (owner only) ----

router.get("/:id/webhook", authMiddleware, (req, res) => {
  const w = ownedWidget(req);
  if (!w) return res.status(404).json({ error: "Widget not found" });
  const row = db.prepare("SELECT url, secret, enabled, created_at, updated_at FROM webhook_endpoints WHERE widget_id = ?").get(w.id);
  res.json({ webhook: webhookJson(row) });
});

router.put("/:id/webhook", authMiddleware, async (req, res) => {
  const w = ownedWidget(req);
  if (!w) return res.status(404).json({ error: "Widget not found" });
  const body = req.body || {};
  const invalid = await webhook.validateUrlResolved(body.url, webhookOptions());
  if (invalid) return res.status(400).json({ error: invalid });
  if (body.enabled !== undefined && typeof body.enabled !== "boolean") return res.status(400).json({ error: "enabled must be true or false" });
  if (body.rotateSecret !== undefined && typeof body.rotateSecret !== "boolean") return res.status(400).json({ error: "rotateSecret must be true or false" });
  const url = String(body.url).trim();
  const enabled = body.enabled === false ? 0 : 1;
  const existing = db.prepare("SELECT secret FROM webhook_endpoints WHERE widget_id = ?").get(w.id);
  const secret = (!existing || body.rotateSecret) ? webhook.randomSecret() : existing.secret;
  if (existing) {
    db.prepare("UPDATE webhook_endpoints SET url = ?, secret = ?, enabled = ?, updated_at = datetime('now') WHERE widget_id = ?")
      .run(url, secret, enabled, w.id);
  } else {
    db.prepare("INSERT INTO webhook_endpoints (widget_id, url, secret, enabled) VALUES (?, ?, ?, ?)")
      .run(w.id, url, secret, enabled);
  }
  const row = db.prepare("SELECT url, secret, enabled, created_at, updated_at FROM webhook_endpoints WHERE widget_id = ?").get(w.id);
  res.json({ webhook: webhookJson(row) });
});

router.delete("/:id/webhook", authMiddleware, (req, res) => {
  const w = ownedWidget(req);
  if (!w) return res.status(404).json({ error: "Widget not found" });
  db.prepare("DELETE FROM webhook_endpoints WHERE widget_id = ?").run(w.id);
  db.prepare("DELETE FROM webhook_deliveries WHERE widget_id = ?").run(w.id);
  res.json({ ok: true });
});

router.post("/:id/webhook/test", authMiddleware, rateLimit("webhook-test", 10, 60000), async (req, res) => {
  const w = ownedWidget(req);
  if (!w) return res.status(404).json({ error: "Widget not found" });
  const endpoint = db.prepare("SELECT url, secret FROM webhook_endpoints WHERE widget_id = ?").get(w.id);
  if (!endpoint) return res.status(400).json({ error: "Configure a webhook first" });
  const event = webhook.payload(w, { id: null, createdAt: new Date().toISOString(), data: { email: "test@example.com", message: "PopupLoom test delivery" } }, { id: webhook.randomId(), test: true });
  logDeliveryStart(w.id, event, null);
  const result = await webhook.deliver(endpoint, event, webhookOptions());
  logDelivery(w.id, event, null, result);
  res.json({ ok: result.ok, status: result.status, attempts: result.attempts, error: result.error });
});

router.get("/:id/webhook/deliveries", authMiddleware, (req, res) => {
  const w = ownedWidget(req);
  if (!w) return res.status(404).json({ error: "Widget not found" });
  const limit = req.query.limit === undefined ? 20 : Number(req.query.limit);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) return res.status(400).json({ error: "Invalid limit" });
  const rows = db.prepare("SELECT id, submission_id, event, test, status, attempts, response_status, error, created_at, completed_at FROM webhook_deliveries WHERE widget_id = ? ORDER BY rowid DESC LIMIT ?").all(w.id, limit);
  res.json(rows.map(function (r) {
    return {
      id: r.id,
      submissionId: r.submission_id,
      event: r.event,
      test: !!r.test,
      status: r.status,
      attempts: r.attempts,
      responseStatus: r.response_status,
      error: r.error,
      createdAt: r.created_at,
      completedAt: r.completed_at
    };
  }));
});

// ---- Public events (called by the embedded runtime on third-party sites) ----

// Record a view (increments counter).
// Public, fire-and-forget telemetry from third-party pages. Unknown ids
// (demo configs, hand-written embeds, deleted widgets) are dropped silently:
// a 404 here only ever pollutes the embedder's browser console.
// F-16: Views are deduplicated per (widget, visitor/IP) in a 1-hour window so
// page refreshes or replay scripts cannot inflate metrics.
router.post("/:id/view", rateLimit("view", 600, 60000), (req, res) => {
  const widget = db.prepare("SELECT id FROM widgets WHERE id = ?").get(req.params.id);
  if (!widget) return res.status(204).end();
  // The client-supplied x-visitor-id header is deliberately ignored: it is
  // attacker-controlled and rotating it would mint a fresh bucket per request.
  // req.ip is resolved by Express's configured proxy policy.
  const visitor = req.ip || (req.socket && req.socket.remoteAddress) || "local";
  const isFirst = rateLimit.dedupeView(req.params.id, visitor);
  if (isFirst) {
    db.prepare("UPDATE widgets SET view_count = view_count + 1, updated_at = updated_at WHERE id = ?").run(req.params.id);
  }
  res.json({ ok: true, deduplicated: !isFirst });
});

// Record a submission (lead)
router.post("/:id/submit", rateLimit("submit", 120, 60000), (req, res) => {
  const r = db.prepare("SELECT id FROM widgets WHERE id = ?").get(req.params.id);
  if (!r) {
    // Accept with 2xx so customer pages stay console-clean, but never pretend
    // a lead landed: flag it here and in the response body. The studio's
    // "Test now" mode uses test_ ids by design, so those stay quiet.
    // Unknown public widget IDs are intentionally not logged: callers control this input.
    return res.status(202).json({ ok: false, stored: false, reason: "unknown_widget" });
  }
  const data = req.body && Object.prototype.hasOwnProperty.call(req.body, "data") ? req.body.data : (req.body || {});
  if (!object(data) || validateShape(data) || Buffer.byteLength(JSON.stringify(data)) > 16384) return res.status(400).json({ error: "Submission must be an object up to 16 KB" });
  const requestId = req.body && req.body.requestId;
  if (requestId !== undefined && (typeof requestId !== "string" || !/^[A-Za-z0-9_-]{8,100}$/.test(requestId))) return res.status(400).json({ error: "Invalid request ID" });
  const inserted = db.prepare("INSERT INTO submissions (widget_id, data, request_id) VALUES (?, ?, ?) ON CONFLICT(widget_id, request_id) WHERE request_id IS NOT NULL DO NOTHING").run(req.params.id, JSON.stringify(data), requestId || null);
  if (inserted.changes > 0) dispatchLead(req.params.id, Number(inserted.lastInsertRowid), data);
  res.status(201).json({ ok: true });
});

// List submissions (owner only)
router.get("/:id/submissions", authMiddleware, (req, res) => {
  const r = db.prepare("SELECT id FROM widgets WHERE id = ? AND user_id = ?").get(req.params.id, req.user.id);
  if (!r) return res.status(404).json({ error: "Widget not found" });
  const limit = req.query.limit === undefined ? 200 : Number(req.query.limit);
  const before = req.query.before === undefined ? null : Number(req.query.before);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 500 || (before !== null && (!Number.isSafeInteger(before) || before < 1))) return res.status(400).json({ error: "Invalid pagination parameters" });
  const rows = db.prepare("SELECT id, data, created_at FROM submissions WHERE widget_id = ? AND (? IS NULL OR id < ?) ORDER BY id DESC LIMIT ?").all(req.params.id, before, before, limit);
  res.json(rows.map(x => ({ id: x.id, data: JSON.parse(x.data), createdAt: x.created_at })));
});

module.exports = router;
