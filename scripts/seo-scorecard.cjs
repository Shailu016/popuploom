// scripts/seo-scorecard.cjs — repeatable SEO snapshot.
// Usage:
//   npm run seo:scorecard
//   node scripts/seo-scorecard.cjs [origin]
//
// It audits the live site, optionally reads GSC CSV exports from ./seo/ and
// appends a dated snapshot to docs/seo-scorecard-history.json. No secrets.
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.join(__dirname, "..");
const origin = (process.argv[2] || "https://popuploom.com").replace(/\/+$/, "");
const tmp = path.join(os.tmpdir(), "popuploom-seo-" + process.pid + ".json");

execFileSync(process.execPath, [path.join(__dirname, "seo-audit.cjs"), origin, tmp], { stdio: "ignore" });
const audit = JSON.parse(fs.readFileSync(tmp, "utf8"));
fs.unlinkSync(tmp);

const pages = audit.pages;
const words = pages.map((p) => p.wordCount || 0);
const thin = pages.filter((p) => (p.wordCount || 0) < 400 && !/\/contact\.html$/.test(p.url));
const schema = pages.filter((p) => Array.isArray(p.schema) && p.schema.length);
const sitemap = pages.length;

function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((v) => v.trim() !== ""));
}

function gscTotals(file) {
  if (!fs.existsSync(file)) return null;
  const rows = parseCsv(fs.readFileSync(file, "utf8"));
  if (rows.length < 2) return { rows: 0, clicks: 0, impressions: 0 };
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const ci = header.findIndex((h) => h === "clicks");
  const ii = header.findIndex((h) => h === "impressions");
  if (ci === -1 || ii === -1) return null;
  let clicks = 0, impressions = 0;
  for (const row of rows.slice(1)) {
    clicks += Number(String(row[ci] || "0").replace(/[^\d.-]/g, "")) || 0;
    impressions += Number(String(row[ii] || "0").replace(/[^\d.-]/g, "")) || 0;
  }
  return { rows: rows.length - 1, clicks, impressions };
}

const gscDir = path.join(root, "seo");
const pageStats = gscTotals(path.join(gscDir, "gsc-pages.csv"));
const queryStats = gscTotals(path.join(gscDir, "gsc-queries.csv"));

const snapshot = {
  date: new Date().toISOString().slice(0, 10),
  origin,
  sitemap,
  issues: audit.issues.length,
  totalWords: words.reduce((a, b) => a + b, 0),
  averageWords: Math.round(words.reduce((a, b) => a + b, 0) / Math.max(1, words.length)),
  thinPages: thin.length,
  schemaCoverage: schema.length,
  gsc: pageStats || queryStats ? { pages: pageStats, queries: queryStats } : null
};

const historyFile = path.join(root, "docs", "seo-scorecard-history.json");
let history = [];
try { history = JSON.parse(fs.readFileSync(historyFile, "utf8")); } catch (e) {}
history.push(snapshot);
fs.writeFileSync(historyFile, JSON.stringify(history, null, 2) + "\n");

const rows = history.slice(-12).map((h) =>
  `| ${h.date} | ${h.sitemap} | ${h.issues} | ${h.averageWords} | ${h.thinPages} | ${h.schemaCoverage}/${h.sitemap} | ${h.gsc ? `${h.gsc.pages ? h.gsc.pages.clicks : "-"} / ${h.gsc.pages ? h.gsc.pages.impressions : "-"}` : "n/a"} |`
).join("\n");

const markdown = `# SEO scorecard

Last run: ${snapshot.date} · ${origin}

| Metric | Value |
|---|---:|
| Sitemap pages | ${snapshot.sitemap} |
| Audit issues | ${snapshot.issues} |
| Average words per page | ${snapshot.averageWords} |
| Pages under 400 words | ${snapshot.thinPages} |
| Pages with structured data | ${snapshot.schemaCoverage}/${snapshot.sitemap} |
| GSC clicks / impressions (from CSV) | ${pageStats ? `${pageStats.clicks} / ${pageStats.impressions}` : "n/a"} |

## History

| Date | Pages | Issues | Avg words | Thin | Schema | Clicks / impressions |
|---|---:|---:|---:|---:|---:|---:|
${rows}

## How to record GSC data

1. In Search Console, open **Performance**.
2. Set the date range and export the **Pages** table as CSV.
3. Save it as \`seo/gsc-pages.csv\` and the **Queries** export as \`seo/gsc-queries.csv\`.
4. Run \`npm run seo:scorecard\` again.

The scorecard never invents traffic data. Without the CSVs it records site health only.
`;

fs.writeFileSync(path.join(root, "docs", "SEO_SCORECARD.md"), markdown);
console.log(markdown);
