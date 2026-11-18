// tests/password-reset.test.cjs — isolated Express + browser coverage for the
// password reset flow. The email provider is always mocked; no network request
// leaves the process and the real project database is never opened.
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");

const root = path.resolve(__dirname, "..");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "popuploom-reset-"));
process.env.DB_PATH = path.join(temp, "reset-test.db");
process.env.JWT_SECRET = crypto.randomBytes(32).toString("hex");
process.env.NODE_ENV = "test";
process.env.TRUST_PROXY = "";
process.env.GOOGLE_CLIENT_ID = "";
process.env.RESEND_API_KEY = "test-resend-key";
process.env.RESET_EMAIL_FROM = "PopupLoom <reset@popuploom.com>";
process.env.PUBLIC_ORIGIN = "https://popuploom.com";

const app = require("../server/index");
const db = require("../server/db");
const auth = require("../server/auth");
const email = require("../shared/email");
const shared = require("../shared/password-reset");

let server, base;
let sent = [];
const realSend = email.sendPasswordResetEmail;
email.sendPasswordResetEmail = async (config, message) => {
  sent.push({ config, message });
  return { ok: true };
};

async function api(url, { method = "GET", body, token, headers = {} } = {}) {
  const res = await fetch(base + url, {
    method,
    headers: {
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: "Bearer " + token } : {}),
      ...headers
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch (e) { data = text; }
  return { status: res.status, data, headers: res.headers, text };
}

function tick() {
  return new Promise((resolve) => setImmediate(resolve));
}

async function waitFor(check, label) {
  for (let i = 0; i < 100; i++) {
    if (check()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("Timed out waiting for " + (label || "condition"));
}

function lastSentFor(address) {
  return sent.filter((entry) => entry.message.to === address).pop();
}

async function account(emailAddress, password = "original-password-123") {
  const response = await api("/api/auth/register", { method: "POST", body: { email: emailAddress, password } });
  assert.equal(response.status, 201, JSON.stringify(response.data));
  return response.data;
}

before(async () => {
  server = await new Promise((resolve) => {
    const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
  });
  base = "http://127.0.0.1:" + server.address().port;
});

after(async () => {
  email.sendPasswordResetEmail = realSend;
  if (server) await new Promise((resolve) => server.close(resolve));
  db.close();
  fs.rmSync(temp, { recursive: true, force: true });
});

test("unknown, Google-only and existing accounts get indistinguishable responses", async () => {
  const known = "known." + Date.now() + "@example.com";
  await account(known);

  const unknown = await api("/api/auth/forgot-password", { method: "POST", body: { email: "missing." + Date.now() + "@example.com" } });
  const before = sent.length;
  const existing = await api("/api/auth/forgot-password", { method: "POST", body: { email: "  " + known.toUpperCase() + " " } });
  const googleOnly = await api("/api/auth/forgot-password", { method: "POST", body: { email: "google-only." + Date.now() + "@example.com" } });

  assert.equal(unknown.status, 200);
  assert.equal(existing.status, 200);
  assert.deepEqual(unknown.data, existing.data);
  assert.deepEqual(googleOnly.data, existing.data);
  assert.equal(typeof existing.data.message, "string");
  assert.ok(existing.data.message.includes("If an account exists"));
  assert.equal(JSON.stringify(unknown.data).includes("token"), false);

  await waitFor(() => sent.length > before, "reset email delivery");
  const delivery = lastSentFor(known);
  assert.ok(delivery, "existing password accounts receive a message");
  assert.equal(delivery.message.to, known);
  assert.equal(delivery.config.origin, "https://popuploom.com");
  assert.match(delivery.message.token, /^[A-Za-z0-9_-]{43}$/);

  const row = db.prepare("SELECT * FROM password_reset_tokens WHERE email = ?").get(known);
  assert.ok(row, "token row exists for the normalized address");
  assert.equal(row.token_hash, crypto.createHash("sha256").update(delivery.message.token).digest("hex"));
  assert.notEqual(row.token_hash, delivery.message.token);
  assert.equal(JSON.stringify(row).includes(delivery.message.token), false, "raw token is never stored");
  assert.ok(row.created_at > 0 && row.expires_at - row.created_at === 30 * 60);
  assert.equal(row.used_at, null);

  const rendered = email.renderResetEmail({ resetUrl: email.buildResetUrl("https://popuploom.com", delivery.message.token) });
  assert.equal(rendered.subject, "Reset your PopupLoom password");
  assert.ok(rendered.text.includes("https://popuploom.com/reset-password.html#token=" + delivery.message.token));
  assert.ok(rendered.text.includes("expires in 30 minutes"));
  assert.ok(!/password[:=]\s*\S+/i.test(rendered.text.replace(/password reset/gi, "")), "no password is emailed");
  assert.ok(!rendered.html.includes(delivery.message.token + '" onerror'));
});

test("expired, malformed, weak and replayed resets fail with generic token errors", async () => {
  const address = "expiry." + Date.now() + "@example.com";
  await account(address);
  await api("/api/auth/forgot-password", { method: "POST", body: { email: address } });
  await waitFor(() => lastSentFor(address));
  const token = lastSentFor(address).message.token;

  const malformed = ["", "x", "a".repeat(42), "a".repeat(44), "b!".repeat(21) + "b", null];
  const messages = new Set();
  for (const candidate of malformed) {
    const response = await api("/api/auth/reset-password", { method: "POST", body: { token: candidate, password: "replacement-password-123" } });
    assert.equal(response.status, 400);
    assert.equal(response.data.code, "INVALID_RESET_TOKEN");
    messages.add(response.data.error);
  }
  assert.equal(messages.size, 1, "all token failures share one message");

  let response = await api("/api/auth/reset-password", { method: "POST", body: { token, password: "short" } });
  assert.equal(response.status, 400);
  assert.equal(response.data.code, "WEAK_PASSWORD");
  response = await api("/api/auth/reset-password", { method: "POST", body: { token, password: "x".repeat(73) } });
  assert.equal(response.data.code, "WEAK_PASSWORD");

  db.prepare("UPDATE password_reset_tokens SET expires_at = ? WHERE token_hash = ?")
    .run(Math.floor(Date.now() / 1000) - 1, crypto.createHash("sha256").update(token).digest("hex"));
  response = await api("/api/auth/reset-password", { method: "POST", body: { token, password: "replacement-password-123" } });
  assert.equal(response.status, 400);
  assert.equal(response.data.code, "INVALID_RESET_TOKEN");
  assert.equal(db.prepare("SELECT used_at FROM password_reset_tokens WHERE email = ?").get(address).used_at, null, "expired tokens are not consumed");

  // A fresh token succeeds once, then replay is rejected.
  await api("/api/auth/forgot-password", { method: "POST", body: { email: address } });
  await waitFor(() => lastSentFor(address).message.token !== token);
  const fresh = lastSentFor(address).message.token;
  response = await api("/api/auth/reset-password", { method: "POST", body: { token: fresh, password: "replacement-password-123" } });
  assert.equal(response.status, 200);
  assert.equal(response.data.ok, true);
  response = await api("/api/auth/reset-password", { method: "POST", body: { token: fresh, password: "another-password-1234" } });
  assert.equal(response.status, 400);
  assert.equal(response.data.code, "INVALID_RESET_TOKEN");
});

test("reset revokes sessions, invalidates older links and enforces the password policy", async () => {
  const address = "rotate." + Date.now() + "@example.com";
  const created = await account(address, "original-password-123");

  await api("/api/auth/forgot-password", { method: "POST", body: { email: address } });
  await waitFor(() => lastSentFor(address));
  const older = lastSentFor(address).message.token;

  await api("/api/auth/forgot-password", { method: "POST", body: { email: address } });
  await waitFor(() => lastSentFor(address).message.token !== older);
  const newest = lastSentFor(address).message.token;

  let response = await api("/api/auth/reset-password", { method: "POST", body: { token: older, password: "brand-new-password-123" } });
  assert.equal(response.status, 400, "a newer request invalidates earlier links");

  response = await api("/api/auth/reset-password", { method: "POST", body: { token: newest, password: "brand-new-password-123" } });
  assert.equal(response.status, 200);

  assert.equal((await api("/api/auth/me", { token: created.token })).status, 401, "existing sessions are revoked");
  assert.equal((await api("/api/auth/login", { method: "POST", body: { email: address, password: "original-password-123" } })).status, 401);
  const login = await api("/api/auth/login", { method: "POST", body: { email: address, password: "brand-new-password-123" } });
  assert.equal(login.status, 200);
  assert.ok(login.data.token);
});

test("Google-only accounts never receive a reset token, and unknown accounts leave no trace", async () => {
  const googleAddress = "googleonly." + Date.now() + "@example.com";
  const profile = { sub: "reset-google-" + Date.now(), email: googleAddress, emailVerified: true };
  auth.findOrCreateGoogleUser(profile);
  const before = sent.length;

  const googleResponse = await api("/api/auth/forgot-password", { method: "POST", body: { email: googleAddress } });
  const unknownAddress = "nobody." + Date.now() + "@example.com";
  const unknownResponse = await api("/api/auth/forgot-password", { method: "POST", body: { email: unknownAddress } });

  assert.equal(googleResponse.status, 200);
  assert.equal(unknownResponse.status, 200);
  assert.deepEqual(googleResponse.data, unknownResponse.data);
  await tick();
  await tick();
  assert.equal(sent.length, before, "no email is delivered");
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM password_reset_tokens WHERE email IN (?, ?)").get(googleAddress, unknownAddress).n, 0);
});

test("provider failure keeps the generic response and never leaks the token", async () => {
  const address = "provider." + Date.now() + "@example.com";
  await account(address);
  const failing = email.sendPasswordResetEmail;
  email.sendPasswordResetEmail = async () => { throw new Error("provider unavailable"); };
  try {
    const response = await api("/api/auth/forgot-password", { method: "POST", body: { email: address } });
    assert.equal(response.status, 200);
    assert.equal(response.text.includes("token"), false);
    assert.equal(response.text.includes("provider"), false);
    await tick();
    await tick();
    const row = db.prepare("SELECT * FROM password_reset_tokens WHERE email = ?").get(address);
    assert.ok(row, "a hash is stored even when delivery fails");
  } finally {
    email.sendPasswordResetEmail = failing;
  }
});

test("missing email configuration fails clearly before any account lookup", async () => {
  const original = process.env.RESEND_API_KEY;
  delete process.env.RESEND_API_KEY;
  const before = sent.length;
  try {
    const response = await api("/api/auth/forgot-password", { method: "POST", body: { email: "anything@example.com" } });
    assert.equal(response.status, 503);
    assert.equal(response.data.code, "RESET_EMAIL_NOT_CONFIGURED");
    assert.match(response.data.error, /RESEND_API_KEY/);
    assert.match(response.data.error, /restart/i);
    assert.equal(sent.length, before);
  } finally {
    process.env.RESEND_API_KEY = original;
  }
});

test("reset requests are rate limited per normalized email", async () => {
  const address = "limited." + Date.now() + "@example.com";
  await account(address);
  let statuses = [];
  for (let i = 0; i < 6; i++) {
    const response = await api("/api/auth/forgot-password", { method: "POST", body: { email: i % 2 ? address.toUpperCase() : address } });
    statuses.push(response.status);
  }
  assert.deepEqual(statuses.slice(0, 5), [200, 200, 200, 200, 200]);
  assert.equal(statuses[5], 429);
});

test("untrusted browser origins still cannot submit reset requests", async () => {
  const response = await api("/api/auth/forgot-password", {
    method: "POST",
    body: { email: "origin@example.com" },
    headers: { Origin: "https://untrusted.example" }
  });
  assert.equal(response.status, 403);
  assert.equal(response.data.error, "Origin is not allowed");
});

const browserPath = process.env.POPUPLOOM_BROWSER || [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
].find((candidate) => fs.existsSync(candidate));

test("browser: login link, request form, reset form and URL token cleanup", { skip: !browserPath, timeout: 120000 }, async () => {
  const puppeteer = require("puppeteer-core");
  const browser = await puppeteer.launch({
    executablePath: browserPath,
    headless: true,
    args: ["--no-sandbox"],
    userDataDir: path.join(temp, "browser")
  });
  try {
    const page = await browser.newPage();
    const errors = [];
    const logs = [];
    const requests = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (message) => logs.push(message.text()));
    page.on("request", (request) => requests.push({ url: request.url(), type: request.resourceType(), headers: request.headers() }));

    await page.goto(base, { waitUntil: "networkidle0" });
    await page.evaluate(() => openAuthModal());
    const link = await page.$eval("#authForgot", (el) => ({ text: el.textContent.trim(), href: el.href, visible: getComputedStyle(el).visibility }));
    assert.equal(link.text, "Forgot password?");
    assert.match(link.href, /\/reset-password\.html$/);
    assert.equal(link.visible, "visible");
    await Promise.all([page.waitForNavigation({ waitUntil: "domcontentloaded" }), page.click("#authForgot")]);
    assert.equal(new URL(page.url()).pathname, "/reset-password.html");
    assert.equal(await page.$eval("#requestPanel", (el) => el.hidden), false);

    const address = "browser." + Date.now() + "@example.com";
    await account(address);
    const before = sent.length;
    await page.type("#resetEmail", address);
    await page.click("#requestSubmit");
    await page.waitForFunction(() => {
      const el = document.getElementById("resetStatus");
      return !el.hidden && el.textContent.length > 0;
    });
    await waitFor(() => sent.length > before, "browser request email");
    const token = lastSentFor(address).message.token;
    assert.match(token, /^[A-Za-z0-9_-]{43}$/);
    assert.equal((await page.$eval("#resetStatus", (el) => el.textContent)).includes("If an account exists"), true);

    requests.length = 0;
    await page.goto("about:blank");
    await page.goto(base + "/reset-password.html#token=" + token, { waitUntil: "networkidle0" });
    assert.equal(new URL(page.url()).hash, "", "token is removed from the address bar");
    assert.equal(page.url().includes(token), false);
    assert.equal(await page.$eval("#resetPanel", (el) => el.hidden), false);
    assert.equal(await page.$eval("#requestPanel", (el) => el.hidden), true);

    const storage = await page.evaluate(() => ({
      local: JSON.stringify(localStorage),
      session: JSON.stringify(sessionStorage),
      referrer: document.referrer
    }));
    assert.equal(storage.local.includes(token), false);
    assert.equal(storage.session.includes(token), false);
    assert.equal(storage.referrer.includes(token), false);
    // The fragment is part of the browser's own document URL; it must not appear
    // in any subresource/API request or in any outgoing request header.
    assert.equal(requests.filter((r) => r.type !== "document" && r.url.includes(token)).length, 0, "no subresource URL contains the token");
    assert.equal(requests.some((r) => JSON.stringify(r.headers).includes(token)), false, "no request header contains the token");
    assert.equal(logs.some((line) => line.includes(token)), false, "the token is never logged");
    requests.length = 0;

    await page.type("#newPassword", "brand-new-password-123");
    await page.type("#confirmPassword", "brand-new-password-123");
    await page.click("#resetSubmit");
    await page.waitForFunction(() => !document.getElementById("donePanel").hidden);
    const done = await page.$eval("#resetStatus", (el) => el.textContent);
    assert.match(done, /password has been reset/i);
    assert.equal((await api("/api/auth/login", { method: "POST", body: { email: address, password: "brand-new-password-123" } })).status, 200);
    assert.equal((await api("/api/auth/login", { method: "POST", body: { email: address, password: "original-password-123" } })).status, 401);
    assert.deepEqual(errors, []);

    // A fresh page with a bad fragment offers the request form again.
    await page.goto("about:blank");
    await page.goto(base + "/reset-password.html#token=not-a-valid-token", { waitUntil: "domcontentloaded" });
    assert.equal(new URL(page.url()).hash, "");
    assert.equal(await page.$eval("#requestPanel", (el) => el.hidden), false);
    assert.match(await page.$eval("#resetStatus", (el) => el.textContent), /invalid or has expired/i);
  } finally {
    await browser.close();
  }
});

// Runs last because it deliberately exhausts the per-IP reset bucket for this
// server process. Unique addresses keep the per-email bucket out of the way.
test("reset requests are rate limited per IP with Retry-After", async () => {
  let limited = null;
  for (let i = 0; i < 40 && !limited; i++) {
    const response = await api("/api/auth/forgot-password", {
      method: "POST",
      body: { email: "ip-" + i + "-" + Date.now() + "@example.com" }
    });
    if (response.status === 429) limited = response;
    else assert.equal(response.status, 200);
  }
  assert.ok(limited, "the per-IP limit eventually rejects requests");
  assert.match(limited.headers.get("retry-after") || "", /^\d+$/);
});

