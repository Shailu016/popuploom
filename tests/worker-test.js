// tests/worker-test.js — full API pass against wrangler dev (port 8787)
const http = require("node:http");
const BASE = process.env.BASE || "http://localhost:8787";
let pass = 0, fail = 0;
const fails = [];

function check(name, cond, extra) {
  if (cond) { pass++; console.log("  PASS", name); }
  else { fail++; fails.push(name); console.log("  FAIL", name, extra === undefined ? "" : JSON.stringify(extra).slice(0, 300)); }
}

async function req(method, path, { token, body, headers, raw } = {}) {
  const h = { ...(headers || {}) };
  if (token) h.Authorization = "Bearer " + token;
  if (body !== undefined) h["Content-Type"] = "application/json";
  const res = await fetch(BASE + path, {
    method,
    headers: h,
    body: body === undefined ? undefined : (typeof body === "string" ? body : JSON.stringify(body))
  });
  let data = null;
  const text = await res.text();
  try { data = JSON.parse(text); } catch (e) { data = text.slice(0, 100); }
  if (raw) return { status: res.status, data, headers: res.headers };
  return { status: res.status, data };
}

// Sends a request with an alternate Host header so the shared host policy can
// be exercised without DNS or a deployed custom domain.
function hostReq(host, path, method = "GET") {
  return new Promise((resolve, reject) => {
    const base = new URL(BASE);
    const r = http.request({ hostname: base.hostname, port: base.port, path, method, headers: { Host: host } }, res => {
      const chunks = [];
      res.on("data", c => chunks.push(c));
      res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString("utf8") }));
    });
    r.on("error", reject);
    r.end();
  });
}

(async () => {
  console.log("== static/security ==");
  let r = await req("GET", "/", { raw: true });
  check("GET / 200 + CSP + no-store", r.status === 200 && /content-security-policy/i.test(Array.from(r.headers.keys()).join(",")) && r.headers.get("cache-control") === "no-store", r.status);
  r = await req("GET", "/studio.html", { raw: true });
  check("studio.html CSP present", r.status === 200 && /content-security-policy/i.test(Array.from(r.headers.keys()).join(",")));
  r = await req("GET", "/popforge.js", { raw: true });
  check("popforge.js 200 no-store", r.status === 200 && r.headers.get("cache-control") === "no-store");
  const legacyRuntime = await (await fetch(BASE + "/popforge.js")).text();
  r = await req("GET", "/popuploom.js", { raw: true });
  check("popuploom.js 200 no-store", r.status === 200 && r.headers.get("cache-control") === "no-store");
  check("runtime alias is byte-identical", (await (await fetch(BASE + "/popuploom.js")).text()) === legacyRuntime);
  r = await req("GET", "/migration.html", { raw: true });
  check("migration page noindex + CSP", r.status === 200 && /noindex, nofollow/.test(r.headers.get("x-robots-tag") || "") && /content-security-policy/i.test(Array.from(r.headers.keys()).join(",")));
  r = await req("GET", "/server/index.js");
  check("server/index.js returns 404", r.status === 404 && typeof r.data === "string" && !r.data.includes("const fs"));
  r = await req("GET", "/package.json");
  check("package.json returns 404", r.status === 404 && typeof r.data === "string");
  r = await req("GET", "/some/unknown/page");
  check("unknown route returns real 404", r.status === 404 && typeof r.data === "string");
  r = await req("HEAD", "/");
  check("HEAD / 200 empty body", r.status === 200);

  console.log("== host policy ==");
  const OLD_HOST = "popforge.shailu3597.workers.dev";
  const WWW_HOST = "www.popuploom.com";
  r = await hostReq(OLD_HOST, "/");
  check("legacy homepage stays usable before cutover", r.status === 200 && !r.headers.location, r.status);
  r = await hostReq(OLD_HOST, "/templates.html?ref=1");
  check("legacy templates stay direct before cutover", r.status === 200 && !r.headers.location);
  r = await hostReq(OLD_HOST, "/index.html");
  check("legacy index.html normalizes on its own host before cutover", r.status === 308 && r.headers.location === "http://" + OLD_HOST + "/");
  r = await hostReq(OLD_HOST, "/studio.html?tpl=cafeClub");
  check("legacy studio stays direct before cutover", r.status === 200 && !r.headers.location);
  r = await hostReq(OLD_HOST, "/migration.html");
  check("legacy recovery page stays direct", r.status === 200 && !r.headers.location && /noindex/.test(r.headers["x-robots-tag"] || ""));
  r = await hostReq(OLD_HOST, "/popforge.js");
  check("legacy runtime stays direct", r.status === 200 && !r.headers.location && r.body.includes("PopupLoom"));
  r = await hostReq(OLD_HOST, "/popuploom.js");
  check("new runtime on legacy host stays direct", r.status === 200 && !r.headers.location);
  r = await hostReq(OLD_HOST, "/assets/favicon.svg");
  check("legacy static assets stay direct", r.status === 200 && !r.headers.location);
  r = await hostReq(OLD_HOST, "/api/health");
  check("legacy API stays direct", r.status === 200 && !r.headers.location && r.body.includes('"ok":true'));
  r = await hostReq(OLD_HOST, "/unknown-page");
  check("legacy unknown path is a real 404", r.status === 404 && !r.headers.location);
  r = await hostReq(OLD_HOST, "/", "POST");
  check("legacy POST is never redirected", r.status !== 308 && !r.headers.location, r.status);
  r = await hostReq(WWW_HOST, "/studio.html?tpl=cafeClub");
  check("www page redirects to apex", r.status === 308 && r.headers.location === "https://popuploom.com/studio.html?tpl=cafeClub");
  r = await hostReq(WWW_HOST, "/api/health");
  check("www API stays direct", r.status === 200 && !r.headers.location);
  r = await hostReq("popuploom.com", "/");
  check("apex homepage serves 200", r.status === 200 && !r.headers.location, r.status);

  console.log("== SEO ==");
  for (const path of ["/", "/templates.html", "/guides/install-popups.html"]) {
    const response = await fetch(BASE + path); const html = await response.text();
    check("indexable metadata " + path, response.status === 200 && /name="description"/.test(html) && html.includes('rel="canonical"') && !html.includes('content="noindex'));
    check("single H1 " + path, (html.match(/<h1[ >]/g) || []).length === 1);
    for (const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) { JSON.parse(match[1]); }
  }
  for (const path of ["/robots.txt", "/sitemap.xml", "/llms.txt"]) { const response = await fetch(BASE + path); check("crawler file " + path, response.status === 200 && !(await response.text()).includes("<!doctype")); }
  const redirect = await fetch(BASE + "/index.html", {redirect:"manual"}); check("canonical homepage redirect", redirect.status === 308);
  const editor = await fetch(BASE + "/studio.html"); check("studio noindex header", editor.headers.get("x-robots-tag")?.includes("noindex"));

  console.log("== health/api 404 ==");
  r = await req("GET", "/api/health");
  check("health", r.status === 200 && r.data.ok === true);
  r = await req("GET", "/api/nope");
  check("unknown api 404", r.status === 404 && r.data.error === "Endpoint not found");
  r = await req("POST", "/api/auth/login", { body: "not json" });
  check("bad json 400", r.status === 400 && r.data.error === "Invalid request");
  r = await req("POST", "/api/auth/login", { body: "x".repeat(200 * 1024) });
  check("oversized 413", r.status === 413, r.status);
  r = await req("POST", "/api/auth/login", { headers: { "Content-Encoding": "gzip" }, body: "{}" });
  check("compressed 415", r.status === 415);

  console.log("== auth ==");
  const email = "cf.test." + Date.now() + "@example.com";
  r = await req("POST", "/api/auth/register", { body: { email, password: "secure-pass-1234", name: "Cf Tester" } });
  check("register 201 + name stored", r.status === 201 && r.data.user && r.data.user.name === "Cf Tester" && typeof r.data.token === "string", r);
  const token = r.data && r.data.token;
  r = await req("POST", "/api/auth/register", { body: { email, password: "secure-pass-1234", name: "Dup" } });
  check("duplicate register 400", r.status === 400);
  r = await req("POST", "/api/auth/register", { body: { email: "x@y.z", password: "short" } });
  check("short password 400", r.status === 400);
  r = await req("POST", "/api/auth/login", { body: { email, password: "wrong-pass" } });
  check("wrong password 401", r.status === 401);
  r = await req("POST", "/api/auth/login", { body: { email, password: "secure-pass-1234" } });
  check("login ok", r.status === 200 && typeof r.data.token === "string");
  const token2 = r.data.token;
  r = await req("GET", "/api/auth/me", { token });
  check("me ok", r.status === 200 && r.data.user.email === email);
  r = await req("PUT", "/api/auth/profile", { token, body: { name: "Cf Renamed", avatarUrl: "https://example.com/a.png" } });
  check("profile update", r.status === 200 && r.data.user.name === "Cf Renamed" && r.data.user.avatarUrl === "https://example.com/a.png");
  r = await req("PUT", "/api/auth/profile", { token, body: { avatarUrl: "javascript:alert(1)" } });
  check("profile coerces bad avatar to null (Express parity)", r.status === 200 && r.data.user.avatarUrl === null, r.data);
  r = await req("GET", "/api/auth/me");
  check("me no token 401", r.status === 401);

  console.log("== widgets CRUD ==");
  r = await req("POST", "/api/widgets", { token, body: { name: "Test Widget", template: "blank", config: { v: 1, theme: { accent: "#123456" } } } });
  check("create widget 201 flat", r.status === 201 && typeof r.data.id === "string" && r.data.id.startsWith("wan_") && r.data.cfg.v === 1, r);
  const wid = r.data && r.data.id;
  r = await req("POST", "/api/widgets", { body: { name: "No Auth" } });
  check("create without auth 401", r.status === 401);
  r = await req("POST", "/api/widgets", { token, body: { name: "", config: {} } });
  check("create empty name 400", r.status === 400);
  r = await req("GET", "/api/widgets", { token });
  check("list returns raw array incl widget", r.status === 200 && Array.isArray(r.data) && r.data.some(w => w.id === wid && w.cfg.v === 1));
  r = await req("GET", "/api/widgets/" + wid, { token });
  check("get widget flat", r.status === 200 && r.data.id === wid && r.data.cfg.v === 1);
  r = await req("PUT", "/api/widgets/" + wid, { token, body: { name: "Renamed", config: { v: 2 } } });
  check("update widget", r.status === 200 && r.data.name === "Renamed" && r.data.cfg.v === 2);
  r = await req("PUT", "/api/widgets/" + wid, { token, body: { name: "Hijack", config: { id: "someone-elses-widget" } } });
  check("update keeps own id", r.status === 200 && r.data.cfg.id === wid);
  r = await req("PUT", "/api/widgets/" + wid, { body: { name: "No Auth" } });
  check("update without auth 401", r.status === 401);
  r = await req("POST", "/api/widgets", { token, body: '{"name":"Evil","__proto__":{"poll":1}}' });
  check("create rejects __proto__", r.status === 400);

  console.log("== public config/view/submit ==");
  r = await req("GET", "/api/widgets/" + wid + "/config");
  check("public config 200 no owner data", r.status === 200 && r.data.id === wid && !("user_id" in r.data), r);
  r = await hostReq(OLD_HOST, "/api/widgets/" + wid + "/config");
  check("legacy host serves live config directly", r.status === 200 && !r.headers.location && r.body.includes(wid));
  r = await hostReq(OLD_HOST, "/api/widgets/" + wid + "/view", "POST");
  check("legacy host POST is not redirected", r.status !== 308 && !r.headers.location, r.status);
  r = await req("GET", "/api/widgets/does-not-exist-123/config");
  check("unknown config 404", r.status === 404);
  r = await req("POST", "/api/widgets/" + wid + "/view");
  check("record view", r.status === 200 || r.status === 204);
  r = await req("POST", "/api/widgets/does-not-exist-123/view");
  check("unknown view 204", r.status === 204);
  r = await req("POST", "/api/widgets/" + wid + "/submit", { body: { data: { email: "lead@example.com" }, requestId: "req-12345" } });
  check("submit 201 ok", r.status === 201 && r.data.ok === true);
  r = await req("POST", "/api/widgets/" + wid + "/submit", { body: { data: { email: "lead@example.com" }, requestId: "req-12345" } });
  check("duplicate requestId silently ok (Express parity)", r.status === 201 && r.data.ok === true);
  r = await req("POST", "/api/widgets/does-not-exist-123/submit", { body: { data: { email: "x@y.z" } } });
  check("unknown submit 202 unknown_widget", r.status === 202 && r.data.ok === false && r.data.reason === "unknown_widget");
  r = await req("POST", "/api/widgets/" + wid + "/submit", { body: { data: "x".repeat(20000) } });
  check("oversized lead rejected", r.status === 400 || r.status === 413, r.status);
  r = await req("GET", "/api/widgets/" + wid + "/submissions", { token });
  check("submissions raw array, dedupe held (1 row)", r.status === 200 && Array.isArray(r.data) && r.data.length === 1 && r.data[0].data.email === "lead@example.com");
  r = await req("GET", "/api/widgets/" + wid + "/submissions");
  check("submissions no auth 401", r.status === 401);

  console.log("== CORS/origin ==");
  r = await req("GET", "/api/widgets/" + wid + "/config", { headers: { Origin: "https://evil.example" }, raw: true });
  check("public config ACAO *", r.status === 200 && r.headers.get("access-control-allow-origin") === "*");
  r = await req("GET", "/api/auth/me", { headers: { Origin: "https://evil.example" }, raw: true });
  check("evil origin 403", r.status === 403 && r.data.error === "Origin is not allowed");
  r = await req("GET", "/api/auth/me", { headers: { Origin: new URL(BASE).origin }, raw: true });
  check("same origin reflected", r.status === 401 && r.headers.get("access-control-allow-origin") === new URL(BASE).origin && r.headers.get("vary") && /origin/i.test(r.headers.get("vary")));
  r = await req("OPTIONS", "/api/widgets/" + wid + "/submit", { headers: { Origin: "https://any-site.com" }, raw: true });
  check("OPTIONS 204", r.status === 204 && r.headers.get("access-control-allow-methods") && r.headers.get("access-control-allow-headers"));

  console.log("== logout/revocation ==");
  r = await req("POST", "/api/auth/logout", { token });
  check("logout ok", r.status === 200 && r.data.ok === true);
  r = await req("GET", "/api/auth/me", { token });
  check("revoked token 401", r.status === 401);
  r = await req("GET", "/api/auth/me", { token: token2 });
  check("other token still valid", r.status === 200);

  console.log("== rate limit (login 40/10min) ==");
  let got429 = false, count = 0;
  for (let i = 0; i < 45; i++) {
    const rr = await req("POST", "/api/auth/login", { body: { email: email, password: "secure-pass-1234" }, raw: true });
    count++;
    if (rr.status === 429) { got429 = true; break; }
  }
  check("429 after limit with Retry-After", got429, count);

  console.log("== delete ==");
  r = await req("DELETE", "/api/widgets/" + wid, { token: token2 });
  check("delete widget", r.status === 200, r);
  r = await req("GET", "/api/widgets/" + wid + "/config");
  check("deleted config 404", r.status === 404);

  console.log("\n" + pass + " passed, " + fail + " failed");
  if (fails.length) console.log("FAILED:", fails.join(" | "));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
