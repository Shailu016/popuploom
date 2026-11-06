// Daily production monitor. No secrets, no writes, no browser.
// Run locally: node scripts/monitor.cjs
const crypto = require("crypto");

const SITE = "https://popuploom.com";
const failures = [];

async function get(url, headers = {}) {
  const res = await fetch(url, { headers: { "User-Agent": "PopupLoom-Monitor/1.0", ...headers } });
  return { status: res.status, headers: res.headers, text: await res.text() };
}

function check(name, condition, detail) {
  if (condition) {
    console.log("ok   " + name);
  } else {
    failures.push(name + (detail ? " — " + detail : ""));
    console.log("FAIL " + name + (detail ? " — " + detail : ""));
  }
}

(async () => {
  const health = await get(SITE + "/api/health");
  check("health endpoint", health.status === 200 && health.text.includes('"ok":true'), "status " + health.status);

  const home = await get(SITE + "/");
  check("homepage", home.status === 200, "status " + home.status);
  const csp = home.headers.get("content-security-policy") || "";
  check("CSP frame-ancestors", csp.includes("frame-ancestors 'none'"));
  check("CSP no unsafe-eval", !csp.includes("unsafe-eval"));
  check("HSTS", (home.headers.get("strict-transport-security") || "").includes("max-age="));
  check("ads disabled", !/adsbygoogle|googlesyndication/.test(home.text));
  check("versioned embed in install docs", home.text.includes("/embed/1.1.0/popuploom.js"));

  const embed = await get(SITE + "/embed/1.1.0/popuploom.js");
  const sums = await get(SITE + "/embed/1.1.0/SHA256SUMS");
  const hash = crypto.createHash("sha256").update(embed.text).digest("hex");
  check(
    "embed checksum",
    embed.status === 200 && sums.status === 200 && sums.text.startsWith(hash + "  popuploom.js"),
    "served hash " + hash
  );
  check("embed immutable cache", (embed.headers.get("cache-control") || "").includes("immutable"));
  check("embed version marker", embed.text.includes('Runtime.version = "1.1.0"'));

  for (const path of ["/security.html", "/faq.html", "/press.html", "/sitemap.xml"]) {
    const r = await get(SITE + path);
    check(path, r.status === 200, "status " + r.status);
  }

  async function doh(name, type) {
    const r = await get("https://cloudflare-dns.com/dns-query?name=" + encodeURIComponent(name) + "&type=" + type, { Accept: "application/dns-json" });
    try { return (JSON.parse(r.text).Answer || []); } catch (e) { return []; }
  }

  const txt = (await doh("popuploom.com", "TXT")).map((a) => a.data).join(" ");
  check("apex SPF", /v=spf1/.test(txt), "no SPF answer");
  check("single SPF record", (txt.match(/v=spf1/g) || []).length === 1, "multiple SPF records");

  const dmarc = (await doh("_dmarc.popuploom.com", "TXT")).map((a) => a.data).join(" ");
  check("DMARC", /v=DMARC1/.test(dmarc), "no DMARC answer");

  check("CAA", (await doh("popuploom.com", "CAA")).length > 0, "no CAA answer");
  check("MX", (await doh("popuploom.com", "MX")).length > 0, "no MX answer");

  if (failures.length) {
    console.error("\nMonitor failed:\n- " + failures.join("\n- "));
    process.exit(1);
  }
  console.log("\nMonitor passed.");
})().catch((error) => {
  console.error("Monitor crashed:", error.message);
  process.exit(1);
});
