// worker/widgets.js — widget CRUD + views + submissions on D1 (port of server/routes/widgets.js)
const { object, validateConfig, validateShape } = require("./validation");
const { ApiError } = require("./auth");
const { json, all, rateLimit, dedupeView } = require("./http");
const webhook = require("../shared/webhook");

const viewLimit = rateLimit("view", 600, 60000);
const submitLimit = rateLimit("submit", 120, 60000);
const webhookTestLimit = rateLimit("webhook-test", 10, 60000);

function allowInsecureWebhooks(env) {
  return env.ALLOW_INSECURE_WEBHOOKS === "true";
}

function webhookOptions(env) {
  return { allowInsecure: allowInsecureWebhooks(env), resolve: webhook.dohResolve };
}

async function ownedWidget(c) {
  return c.env.DB.prepare("SELECT id, name FROM widgets WHERE id = ? AND user_id = ?").bind(c.params.id, c.user.id).first();
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

async function trimDeliveries(env, widgetId) {
  await env.DB.prepare("DELETE FROM webhook_deliveries WHERE widget_id = ? AND rowid NOT IN (SELECT rowid FROM webhook_deliveries WHERE widget_id = ? ORDER BY rowid DESC LIMIT 100)").bind(widgetId, widgetId).run();
}

// Insert the in-flight row before the first attempt so a platform kill leaves a
// visible `pending` record rather than no record. Stale pending rows are swept
// on the next delivery for the same widget.
async function logDeliveryStart(env, widgetId, event, submissionId) {
  try {
    await env.DB.prepare("DELETE FROM webhook_deliveries WHERE widget_id = ? AND status = 'pending' AND created_at < datetime('now','-1 day')").bind(widgetId).run();
    await env.DB.prepare("INSERT OR IGNORE INTO webhook_deliveries (id, widget_id, submission_id, event, test, status, attempts, completed_at) VALUES (?, ?, ?, ?, ?, 'pending', 0, NULL)")
      .bind(event.id, widgetId, submissionId || null, event.event, event.test ? 1 : 0).run();
    await trimDeliveries(env, widgetId);
  } catch (e) {
    console.error("[popuploom] could not start webhook delivery log:", e.message);
  }
}

async function logDelivery(env, widgetId, event, submissionId, result) {
  try {
    const updated = await env.DB.prepare("UPDATE webhook_deliveries SET status = ?, attempts = ?, response_status = ?, error = ?, completed_at = datetime('now') WHERE id = ?")
      .bind(result.ok ? "success" : "failed", result.attempts || 0, result.status || null, result.error ? String(result.error).slice(0, 500) : null, event.id).run();
    if (!updated.meta.changes) {
      await env.DB.prepare("INSERT INTO webhook_deliveries (id, widget_id, submission_id, event, test, status, attempts, response_status, error, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))")
        .bind(event.id, widgetId, submissionId || null, event.event, event.test ? 1 : 0, result.ok ? "success" : "failed", result.attempts || 0, result.status || null, result.error ? String(result.error).slice(0, 500) : null).run();
    }
    await trimDeliveries(env, widgetId);
  } catch (e) {
    console.error("[popuploom] could not record webhook delivery:", e.message);
  }
}

// Runs after the lead response through ctx.waitUntil. Duplicate request IDs are
// filtered by the INSERT itself, so only genuinely new rows are delivered.
async function deliverLead(c, widgetId, submissionId, data) {
  const widget = await c.env.DB.prepare("SELECT id, name FROM widgets WHERE id = ?").bind(widgetId).first();
  const endpoint = await c.env.DB.prepare("SELECT url, secret FROM webhook_endpoints WHERE widget_id = ? AND enabled = 1").bind(widgetId).first();
  if (!widget || !endpoint) return;
  const event = webhook.payload(widget, { id: submissionId, createdAt: new Date().toISOString(), data: data }, { id: webhook.randomId() });
  await logDeliveryStart(c.env, widgetId, event, submissionId);
  const result = await webhook.deliver(endpoint, event, webhookOptions(c.env));
  await logDelivery(c.env, widgetId, event, submissionId, result);
}

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
// Reads always hit D1 and are sent no-store: a stale cached config could
// outlive a delete and keep serving a removed popup.
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
  // Explicit cleanup keeps deletion correct even if a deployment or restored
  // database has foreign-key enforcement disabled.
  await c.env.DB.prepare("DELETE FROM submissions WHERE widget_id = ?").bind(c.params.id).run();
  await c.env.DB.prepare("DELETE FROM webhook_deliveries WHERE widget_id = ?").bind(c.params.id).run();
  await c.env.DB.prepare("DELETE FROM webhook_endpoints WHERE widget_id = ?").bind(c.params.id).run();
  return json({ ok: true });
}

// ---- Lead webhooks (owner only) ----

async function getWebhook(c) {
  const w = await ownedWidget(c);
  if (!w) return json({ error: "Widget not found" }, 404);
  const row = await c.env.DB.prepare("SELECT url, secret, enabled, created_at, updated_at FROM webhook_endpoints WHERE widget_id = ?").bind(w.id).first();
  return json({ webhook: webhookJson(row) });
}

async function putWebhook(c) {
  const w = await ownedWidget(c);
  if (!w) return json({ error: "Widget not found" }, 404);
  const body = c.body || {};
  const invalid = await webhook.validateUrlResolved(body.url, webhookOptions(c.env));
  if (invalid) return json({ error: invalid }, 400);
  if (body.enabled !== undefined && typeof body.enabled !== "boolean") return json({ error: "enabled must be true or false" }, 400);
  if (body.rotateSecret !== undefined && typeof body.rotateSecret !== "boolean") return json({ error: "rotateSecret must be true or false" }, 400);
  const url = String(body.url).trim();
  const enabled = body.enabled === false ? 0 : 1;
  const existing = await c.env.DB.prepare("SELECT secret FROM webhook_endpoints WHERE widget_id = ?").bind(w.id).first();
  const secret = (!existing || body.rotateSecret) ? webhook.randomSecret() : existing.secret;
  if (existing) {
    await c.env.DB.prepare("UPDATE webhook_endpoints SET url = ?, secret = ?, enabled = ?, updated_at = datetime('now') WHERE widget_id = ?")
      .bind(url, secret, enabled, w.id).run();
  } else {
    await c.env.DB.prepare("INSERT INTO webhook_endpoints (widget_id, url, secret, enabled) VALUES (?, ?, ?, ?)")
      .bind(w.id, url, secret, enabled).run();
  }
  const row = await c.env.DB.prepare("SELECT url, secret, enabled, created_at, updated_at FROM webhook_endpoints WHERE widget_id = ?").bind(w.id).first();
  return json({ webhook: webhookJson(row) });
}

async function deleteWebhook(c) {
  const w = await ownedWidget(c);
  if (!w) return json({ error: "Widget not found" }, 404);
  await c.env.DB.prepare("DELETE FROM webhook_endpoints WHERE widget_id = ?").bind(w.id).run();
  await c.env.DB.prepare("DELETE FROM webhook_deliveries WHERE widget_id = ?").bind(w.id).run();
  return json({ ok: true });
}

async function testWebhook(c) {
  await webhookTestLimit(c.request, c.env);
  const w = await ownedWidget(c);
  if (!w) return json({ error: "Widget not found" }, 404);
  const endpoint = await c.env.DB.prepare("SELECT url, secret FROM webhook_endpoints WHERE widget_id = ?").bind(w.id).first();
  if (!endpoint) return json({ error: "Configure a webhook first" }, 400);
  const event = webhook.payload(w, { id: null, createdAt: new Date().toISOString(), data: { email: "test@example.com", message: "PopupLoom test delivery" } }, { id: webhook.randomId(), test: true });
  await logDeliveryStart(c.env, w.id, event, null);
  const result = await webhook.deliver(endpoint, event, webhookOptions(c.env));
  await logDelivery(c.env, w.id, event, null, result);
  return json({ ok: result.ok, status: result.status, attempts: result.attempts, error: result.error });
}

async function listWebhookDeliveries(c) {
  const w = await ownedWidget(c);
  if (!w) return json({ error: "Widget not found" }, 404);
  const limit = c.query.limit === undefined ? 20 : Number(c.query.limit);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) return json({ error: "Invalid limit" }, 400);
  const rows = await all(c.env.DB.prepare("SELECT id, submission_id, event, test, status, attempts, response_status, error, created_at, completed_at FROM webhook_deliveries WHERE widget_id = ? ORDER BY rowid DESC LIMIT ?").bind(w.id, limit));
  return json(rows.map(function (r) {
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
}

// ---- Public events (called by the embedded runtime on third-party sites) ----

// Record a view (increments counter).
// Public, fire-and-forget telemetry from third-party pages. Unknown ids
// (demo configs, hand-written embeds, deleted widgets) are dropped silently:
// a 404 here only ever pollutes the embedder's browser console.
// F-16: Views are deduplicated per (widget, visitor/IP) in a 1-hour window so
// page refreshes or replay scripts cannot inflate metrics.
async function recordView(c) {
  await viewLimit(c.request, c.env);
  const widget = await c.env.DB.prepare("SELECT id FROM widgets WHERE id = ?").bind(c.params.id).first();
  if (!widget) return new Response(null, { status: 204 });
  const isFirst = await dedupeView(c.env, c.params.id, c.request);
  if (isFirst) {
    await c.env.DB.prepare("UPDATE widgets SET view_count = view_count + 1, updated_at = updated_at WHERE id = ?").bind(c.params.id).run();
  }
  return json({ ok: true, deduplicated: !isFirst });
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
  const inserted = await c.env.DB.prepare("INSERT INTO submissions (widget_id, data, request_id) VALUES (?, ?, ?) ON CONFLICT(widget_id, request_id) WHERE request_id IS NOT NULL DO NOTHING")
    .bind(c.params.id, JSON.stringify(data), requestId || null).run();
  if (inserted.meta.changes > 0) {
    const delivery = deliverLead(c, c.params.id, inserted.meta.last_row_id, data).catch(function (e) {
      console.error("[popuploom] webhook delivery failed:", e && e.message);
    });
    if (c.ctx && typeof c.ctx.waitUntil === "function") c.ctx.waitUntil(delivery);
    else await delivery;
  }
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

module.exports = { listWidgets, getWidgetConfig, getWidget, createWidget, updateWidget, deleteWidget, getWebhook, putWebhook, deleteWebhook, testWebhook, listWebhookDeliveries, recordView, recordSubmit, listSubmissions };
