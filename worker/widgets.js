// worker/widgets.js — widget CRUD + views + submissions on D1 (port of server/routes/widgets.js)
const { object, validateConfig, validateShape } = require("./validation");
const { ApiError } = require("./auth");
const { json, all, rateLimit } = require("./http");

const viewLimit = rateLimit("view", 600, 60000);
const submitLimit = rateLimit("submit", 120, 60000);

function randomWidgetId() {
  return "wan_" + [...crypto.getRandomValues(new Uint8Array(12))].map(b => b.toString(16).padStart(2, "0")).join("");
}

// List current user's widgets
async function listWidgets(c) {
  const rows = await all(c.env.DB.prepare(
    "SELECT id, name, template, config, view_count, created_at, updated_at, (SELECT COUNT(*) FROM submissions WHERE widget_id = widgets.id) AS submission_count FROM widgets WHERE user_id = ? ORDER BY updated_at DESC"
  ).bind(c.user.id));
  return json(rows.map(r => ({
    id: r.id, name: r.name, template: r.template,
    cfg: JSON.parse(r.config), viewCount: r.view_count, submissionCount: r.submission_count,
    createdAt: r.created_at, updatedAt: r.updated_at
  })));
}

// Public read-only config for the embedded runtime.
// This is what a signed-in user's install snippet fetches on their site, so
// edits in the studio go live without re-pasting. Only presentational data
// leaves the server: no owner id, no counters, no leads.
// Cached for 30s via the Cache API (Cloudflare does not edge-cache workers.dev
// responses by default) with the same header the Express server advertised.
async function getWidgetConfig(c) {
  const r = await c.env.DB.prepare("SELECT id, name, template, config, updated_at FROM widgets WHERE id = ?").bind(c.params.id).first();
  if (!r) return json({ error: "Widget not found" }, 404);
  let cfg;
  try { cfg = JSON.parse(r.config); } catch (e) { return json({ error: "Widget config is unreadable" }, 500); }
  if (!cfg || typeof cfg !== "object") return json({ error: "Widget config is unreadable" }, 500);
  cfg.id = r.id;
  if (!cfg.name) cfg.name = r.name;
  const res = json({ id: r.id, name: r.name, template: r.template, cfg, updatedAt: r.updated_at }, 200, {
    "Cache-Control": "no-store"
  });
  return res;
}

// Get one widget (owner only)
async function getWidget(c) {
  const r = await c.env.DB.prepare(
    "SELECT id, name, template, config, view_count, created_at, updated_at FROM widgets WHERE id = ? AND user_id = ?"
  ).bind(c.params.id, c.user.id).first();
  if (!r) return json({ error: "Widget not found" }, 404);
  return json({ id: r.id, name: r.name, template: r.template, cfg: JSON.parse(r.config), viewCount: r.view_count, createdAt: r.created_at, updatedAt: r.updated_at });
}

// Create
async function createWidget(c) {
  const { name, template, config } = c.body || {};
  if (typeof name !== "string" || !name.trim() || name.length > 200) return json({ error: "name must be 1–200 characters" }, 400);
  const invalid = validateConfig(config);
  if (invalid) return json({ error: invalid }, 400);
  if (template != null && (typeof template !== "string" || template.length > 100)) return json({ error: "Invalid template" }, 400);
  // The database id is always server-generated. Honouring a client-chosen id
  // would let a new account reclaim the id of a deleted widget, so an embed
  // left on a customer site would silently start serving someone else's popup.
  const id = randomWidgetId();
  config.id = id;
  await c.env.DB.prepare("INSERT INTO widgets (id, user_id, name, template, config) VALUES (?, ?, ?, ?, ?)")
    .bind(id, c.user.id, name, template || null, JSON.stringify(config)).run();
  return json({ id, name, template, cfg: config, viewCount: 0 }, 201);
}

// The public /config response is cached for 30s (see getWidgetConfig), so an
// edit or delete must evict it or embedders keep the old config until expiry.
// Config reads always use D1; no per-location cache can outlive a delete.
// Update (name and/or config)
async function updateWidget(c) {
  const { name, config } = c.body || {};
  const r = await c.env.DB.prepare("SELECT id FROM widgets WHERE id = ? AND user_id = ?").bind(c.params.id, c.user.id).first();
  if (!r) return json({ error: "Widget not found" }, 404);
  if (name !== undefined && (typeof name !== "string" || !name.trim() || name.length > 200)) return json({ error: "name must be 1–200 characters" }, 400);
  if (config !== undefined) {
    const invalid = validateConfig(config);
    if (invalid) return json({ error: invalid }, 400);
  }
  if (name !== undefined) await c.env.DB.prepare("UPDATE widgets SET name = ?, updated_at = datetime('now') WHERE id = ?").bind(name, c.params.id).run();
  if (config !== undefined) {
    if (config && typeof config === "object") config.id = c.params.id;
    await c.env.DB.prepare("UPDATE widgets SET config = ?, updated_at = datetime('now') WHERE id = ?").bind(JSON.stringify(config), c.params.id).run();
  }
  const updated = await c.env.DB.prepare("SELECT id, name, template, config, view_count, updated_at FROM widgets WHERE id = ?").bind(c.params.id).first();
  return json({ id: updated.id, name: updated.name, template: updated.template, cfg: JSON.parse(updated.config), viewCount: updated.view_count, updatedAt: updated.updated_at });
}

// Delete
async function deleteWidget(c) {
  const res = await c.env.DB.prepare("DELETE FROM widgets WHERE id = ? AND user_id = ?").bind(c.params.id, c.user.id).run();
  if (res.meta.changes === 0) return json({ error: "Widget not found" }, 404);
  return json({ ok: true });
}

// ---- Public events (called by the embedded runtime on third-party sites) ----

// Record a view (increments counter).
// Public, fire-and-forget telemetry from third-party pages. Unknown ids
// (demo configs, hand-written embeds, deleted widgets) are dropped silently:
// a 404 here only ever pollutes the embedder's browser console.
async function recordView(c) {
  await viewLimit(c.request, c.env);
  const res = await c.env.DB.prepare("UPDATE widgets SET view_count = view_count + 1, updated_at = updated_at WHERE id = ?").bind(c.params.id).run();
  if (res.meta.changes === 0) return new Response(null, { status: 204 });
  return json({ ok: true });
}

// Record a submission (lead)
async function recordSubmit(c) {
  await submitLimit(c.request, c.env);
  const r = await c.env.DB.prepare("SELECT id FROM widgets WHERE id = ?").bind(c.params.id).first();
  if (!r) {
    // Accept with 2xx so customer pages stay console-clean, but never pretend
    // a lead landed: flag it here and in the response body. The studio's
    // "Test now" mode uses test_ ids by design, so those stay quiet.
    // Unknown public widget IDs are intentionally not logged: callers control this input.
    return json({ ok: false, stored: false, reason: "unknown_widget" }, 202);
  }
  const data = c.body && Object.prototype.hasOwnProperty.call(c.body, "data") ? c.body.data : (c.body || {});
  if (!object(data) || validateShape(data) || new TextEncoder().encode(JSON.stringify(data)).length > 16384) return json({ error: "Submission must be an object up to 16 KB" }, 400);
  const requestId = c.body && c.body.requestId;
  if (requestId !== undefined && (typeof requestId !== "string" || !/^[A-Za-z0-9_-]{8,100}$/.test(requestId))) return json({ error: "Invalid request ID" }, 400);
  await c.env.DB.prepare("INSERT INTO submissions (widget_id, data, request_id) VALUES (?, ?, ?) ON CONFLICT(widget_id, request_id) WHERE request_id IS NOT NULL DO NOTHING")
    .bind(c.params.id, JSON.stringify(data), requestId || null).run();
  return json({ ok: true }, 201);
}

// List submissions (owner only)
async function listSubmissions(c) {
  const r = await c.env.DB.prepare("SELECT id FROM widgets WHERE id = ? AND user_id = ?").bind(c.params.id, c.user.id).first();
  if (!r) return json({ error: "Widget not found" }, 404);
  const limit = c.query.limit === undefined ? 200 : Number(c.query.limit);
  const before = c.query.before === undefined ? null : Number(c.query.before);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 500 || (before !== null && (!Number.isSafeInteger(before) || before < 1))) return json({ error: "Invalid pagination parameters" }, 400);
  const rows = await all(c.env.DB.prepare("SELECT id, data, created_at FROM submissions WHERE widget_id = ? AND (? IS NULL OR id < ?) ORDER BY id DESC LIMIT ?")
    .bind(c.params.id, before, before, limit));
  return json(rows.map(x => ({ id: x.id, data: JSON.parse(x.data), createdAt: x.created_at })));
}

module.exports = { listWidgets, getWidgetConfig, getWidget, createWidget, updateWidget, deleteWidget, recordView, recordSubmit, listSubmissions };
