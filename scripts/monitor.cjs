// Daily production monitor. No secrets, no writes, no browser.
// Run locally: node scripts/monitor.cjs
const crypto = require("crypto");

const SITE = "https://popuploom.com";
const failures = [];

async function get(url, headers = {}) {
  let last;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "PopupLoom-Monitor/1.0", ...headers } });
      return { status: res.status, headers: res.headers, text: await res.text() };
    } catch (error) {
      last = error;
      if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
    }
  }
  throw last;
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
  const guide = await get(SITE + "/guides/install-popups.html");
  check("ad loader on public content", /adsbygoogle\.js/.test(home.text) && /data-pl-ad="1"/.test(guide.text), "missing ad markup");
  check("guide CSP no unsafe-eval", !(guide.headers.get("content-security-policy") || "").includes("unsafe-eval"));
  const account = await get(SITE + "/profile.html");
  check("ads absent on private pages", !/adsbygoogle|data-pl-ad/.test(account.text), "ad code on account page");
  check("versioned embed in install docs", home.text.includes("/embed/1.2.0/popuploom.js"));

  const embed = await get(SITE + "/embed/1.2.0/popuploom.js");
  const sums = await get(SITE + "/embed/1.2.0/SHA256SUMS");
  const hash = crypto.createHash("sha256").update(embed.text).digest("hex");
  check(
    "embed checksum",
    embed.status === 200 && sums.status === 200 && sums.text.startsWith(hash + "  popuploom.js"),
    "served hash " + hash
  );
  check("embed immutable cache", (embed.headers.get("cache-control") || "").includes("immutable"));
  check("embed version marker", embed.text.includes('Runtime.version = "1.2.0"'));
  const frozen = await get(SITE + "/embed/1.1.0/popuploom.js");
  check("frozen 1.1.0 embed unchanged", require("crypto").createHash("sha256").update(frozen.text).digest("hex") === "d452116065ed9181726309d96306665ae1d6c95dce9bffe5ea22922ab6e50ac5");

  for (const path of ["/security.html", "/faq.html", "/press.html", "/sitemap.xml"]) {
    const r = await get(SITE + path);
    check(path, r.status === 200, "status " + r.status);
  }

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  async function doh(name, type) {
    const url = "https://cloudflare-dns.com/dns-query?name=" + encodeURIComponent(name) + "&type=" + type;
    // A single resolver hiccup must not page the owner: retry before failing.
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const r = await get(url, { Accept: "application/dns-json" });
        const answer = JSON.parse(r.text).Answer || [];
        if (answer.length || attempt === 2) return answer;
      } catch (e) {
        if (attempt === 2) return [];
      }
      await sleep(400 * (attempt + 1));
    }
    return [];
  }

  const txt = (await doh("popuploom.com", "TXT")).map((a) => a.data).join(" ");
  check("apex SPF", /v=spf1/.test(txt), "no SPF answer");
  check("single SPF record", (txt.match(/v=spf1/g) || []).length === 1, "multiple SPF records");

  const dmarc = (await doh("_dmarc.popuploom.com", "TXT")).map((a) => a.data).join(" ");
  check("DMARC", /v=DMARC1/.test(dmarc), "no DMARC answer");

  check("CAA", (await doh("popuploom.com", "CAA")).length > 0, "no CAA answer");
  check("MX", (await doh("popuploom.com", "MX")).length > 0, "no MX answer");

  async function sendAlertEmail(list) {
    const apiKey = String(process.env.RESEND_API_KEY || "").trim();
    const alertTo = String(process.env.ALERT_EMAIL_TO || process.env.SECURITY_ALERT_EMAIL || "security@popuploom.com").trim();
    const from = String(process.env.RESET_EMAIL_FROM || "PopupLoom Monitor <security@popuploom.com>").trim();
    if (!apiKey || !alertTo) {
      console.log("note: alert email skipped (RESEND_API_KEY or ALERT_EMAIL_TO not set)");
      return;
    }
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + apiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from,
          to: [alertTo],
          subject: "[ALERT] PopupLoom Production Monitor Failure (" + list.length + " failure" + (list.length === 1 ? "" : "s") + ")",
          text: "PopupLoom Production Monitor detected the following failures on " + SITE + " at " + new Date().toISOString() + ":\n\n" +
                list.map(f => "- " + f).join("\n") +
                "\n\nPlease inspect the environment, headers, and logs immediately."
        })
      });
      if (res.ok) {
        console.log("alert email dispatched to " + alertTo);
      } else {
        console.warn("alert email send returned status " + res.status);
      }
    } catch (err) {
      console.warn("alert email send failed: " + err.message);
    }
  }

  if (failures.length) {
    console.error("\nMonitor failed:\n- " + failures.join("\n- "));
    await sendAlertEmail(failures);
    process.exit(1);
  }
  console.log("\nMonitor passed.");
})().catch(async (error) => {
  console.error("Monitor crashed:", error.message);
  try {
    const apiKey = String(process.env.RESEND_API_KEY || "").trim();
    const alertTo = String(process.env.ALERT_EMAIL_TO || process.env.SECURITY_ALERT_EMAIL || "security@popuploom.com").trim();
    const from = String(process.env.RESET_EMAIL_FROM || "PopupLoom Monitor <security@popuploom.com>").trim();
    if (apiKey && alertTo) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          to: [alertTo],
          subject: "[ALERT] PopupLoom Production Monitor Crash",
          text: "PopupLoom Production Monitor crashed unexpectedly at " + new Date().toISOString() + ":\n\n" + error.message
        })
      });
    }
  } catch (e) {}
  process.exit(1);
});
