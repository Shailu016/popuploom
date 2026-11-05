/* shared/webhook.js — validation, signing and delivery for lead webhooks.
   Used by both the Express server and the Cloudflare Worker, so behaviour stays
   identical. Delivery runs after the lead is stored; it is retried a few times
   but is not a durable queue. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.PopupLoomWebhook = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const MAX_URL = 2048;

  function hex(bytes) {
    return Array.from(new Uint8Array(bytes)).map(function (b) { return b.toString(16).padStart(2, "0"); }).join("");
  }

  function randomId() {
    var bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return hex(bytes);
  }

  function randomSecret() {
    var bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return hex(bytes);
  }

  function loopback(host) {
    return host === "localhost" || host.endsWith(".localhost") || host === "127.0.0.1" || host === "[::1]" || host === "::1";
  }

  function privateHost(host) {
    host = host.toLowerCase().replace(/\.$/, "");
    if (loopback(host)) return true;
    if (host === "0.0.0.0" || host === "[::]" || host === "::") return true;
    if (host.endsWith(".local") || host.endsWith(".internal") || host === "metadata.google.internal") return true;

    // Numeric shorthand (127.1), integer (2130706433), hex and octal IPv4
    // spellings all resolve to addresses that the dotted-quad check may miss.
    if (/^[0-9]+$/.test(host) || /^0x[0-9a-f]+$/.test(host)) return true;

    var v4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (v4) {
      for (var i = 1; i <= 4; i++) if (v4[i].length > 1 && v4[i][0] === "0") return true;
      var a = Number(v4[1]), b = Number(v4[2]);
      if (a === 0 || a === 10 || a === 127) return true;
      if (a === 100 && b >= 64 && b <= 127) return true;
      if (a === 169 && b === 254) return true;
      if (a === 172 && b >= 16 && b <= 31) return true;
      if (a === 192 && b === 168) return true;
      if (a === 192 && (b === 0 || b === 2)) return true;
      if (a === 198 && (b === 18 || b === 19 || b === 51)) return true;
      if (a === 203 && b === 0) return true;
      if (a >= 224) return true;
      return false;
    }
    // Any remaining dotted-numeric host is a non-canonical IPv4 shorthand.
    if (/^[0-9.]+$/.test(host)) return true;

    var v6 = host.replace(/^\[|\]$/g, "").toLowerCase();
    if (v6 === "::1" || v6 === "::") return true;
    if (/^fe[89ab][0-9a-f]:/.test(v6) || /^f[cd][0-9a-f]{2}:/.test(v6) || /^ff[0-9a-f]{2}:/.test(v6)) return true;
    var mapped = v6.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
    if (mapped) return privateHost(mapped[1]);
    return false;
  }

  // Returns an error message or null. HTTPS is required unless the deployment
  // explicitly opts into insecure URLs (local development and tests only).
  // Loopback is allowed only under that same opt-in.
  function validateUrl(value, options) {
    var allowInsecure = !!(options && options.allowInsecure);
    if (typeof value !== "string") return "Webhook URL is required";
    var raw = value.trim();
    if (!raw) return "Webhook URL is required";
    if (raw.length > MAX_URL) return "Webhook URL is too long";
    var url;
    try { url = new URL(raw); } catch (e) { return "Webhook URL is invalid"; }
    if (url.username || url.password) return "Webhook URL cannot contain credentials";
    var https = url.protocol === "https:";
    if (!https && !(allowInsecure && url.protocol === "http:")) return "Webhook URL must use HTTPS";
    var host = url.hostname.toLowerCase();
    if (!allowInsecure && privateHost(host)) return "Webhook URL cannot target a private or local address";
    if (allowInsecure && !loopback(host) && privateHost(host)) return "Webhook URL cannot target a private address";
    return null;
  }

  async function signature(secret, timestamp, body) {
    var encoder = new TextEncoder();
    var key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    var value = await crypto.subtle.sign("HMAC", key, encoder.encode(timestamp + "." + body));
    return hex(value);
  }

  function sleep(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  function payload(popup, lead, options) {
    var now = new Date().toISOString();
    return {
      event: "lead.created",
      id: (options && options.id) || randomId(),
      createdAt: now,
      test: !!(options && options.test),
      popup: { id: popup.id, name: popup.name || "Untitled popup" },
      lead: { id: lead.id == null ? null : lead.id, createdAt: lead.createdAt || now, data: lead.data || {} }
    };
  }

  // POSTs the event with an HMAC signature and up to three attempts. Retries
  // network errors, timeouts, 408, 429 and 5xx responses. Redirects are not
  // followed so an endpoint cannot bounce the request to another host.
  async function deliver(endpoint, event, options) {
    var body = JSON.stringify(event);
    var attempts = Math.max(1, (options && options.attempts) || 3);
    var delays = (options && options.delays) || [0, 500, 1500];
    var timeoutMs = (options && options.timeoutMs) || 6000;
    var last = { ok: false, attempts: 0, status: null, error: null };
    for (var i = 0; i < attempts; i++) {
      if (i && delays[i]) await sleep(delays[i]);
      last.attempts = i + 1;
      var timestamp = String(Math.floor(Date.now() / 1000));
      try {
        var signed = await signature(endpoint.secret, timestamp, body);
        var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
        var timer = controller ? setTimeout(function () { controller.abort(); }, timeoutMs) : null;
        var response;
        try {
          response = await fetch(endpoint.url, {
            method: "POST",
            redirect: "manual",
            headers: {
              "Content-Type": "application/json",
              "User-Agent": "PopupLoom-Webhook/1.0",
              "X-PopupLoom-Event": event.event,
              "X-PopupLoom-Delivery": event.id,
              "X-PopupLoom-Timestamp": timestamp,
              "X-PopupLoom-Signature": "t=" + timestamp + ",v1=" + signed
            },
            body: body,
            signal: controller ? controller.signal : undefined
          });
        } finally {
          if (timer) clearTimeout(timer);
        }
        last.status = response.status;
        if (response.ok) { last.ok = true; last.error = null; return last; }
        last.error = "Endpoint returned HTTP " + response.status;
        var retryable = response.status === 408 || response.status === 429 || response.status >= 500;
        if (!retryable) return last;
      } catch (e) {
        last.status = null;
        last.error = e && e.name === "AbortError" ? "Request timed out" : String((e && e.message) || e).slice(0, 300);
      }
    }
    return last;
  }

  return {
    validateUrl: validateUrl,
    signature: signature,
    deliver: deliver,
    payload: payload,
    randomId: randomId,
    randomSecret: randomSecret
  };
});
