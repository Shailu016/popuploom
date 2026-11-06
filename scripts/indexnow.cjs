// Submit public sitemap URLs to IndexNow (Bing, Yandex, Seznam and partners).
// Run after a production deploy: npm run indexnow
// Optional: npm run indexnow -- --dry
const fs = require("fs");
const path = require("path");

const SITE = "https://popuploom.com";
const HOST = "popuploom.com";
const KEY = "ccf2a9f45165c635253d22748df4a573";
const KEY_LOCATION = SITE + "/" + KEY + ".txt";
const ENDPOINT = "https://api.indexnow.org/indexnow";

const dry = process.argv.includes("--dry");
const sitemap = fs.readFileSync(path.join(__dirname, "..", "sitemap.xml"), "utf8");
const urlList = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());

if (!urlList.length) throw new Error("No URLs found in sitemap.xml");
for (const url of urlList) {
  if (!url.startsWith(SITE + "/")) throw new Error("Refusing non-canonical URL: " + url);
}

const payload = { host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList };
console.log("IndexNow: " + urlList.length + " URLs for " + HOST);
if (dry) {
  console.log(JSON.stringify(payload, null, 2));
  process.exit(0);
}

fetch(ENDPOINT, {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify(payload),
})
  .then(async (res) => {
    const text = await res.text();
    console.log("IndexNow response: " + res.status + " " + res.statusText);
    if (text) console.log(text.slice(0, 1000));
    if (!res.ok && res.status !== 202) process.exitCode = 1;
  })
  .catch((err) => {
    console.error("IndexNow request failed:", err.message);
    process.exitCode = 1;
  });
