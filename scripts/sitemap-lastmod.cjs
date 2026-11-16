// scripts/sitemap-lastmod.cjs — write real <lastmod> dates into sitemap.xml.
//
// A lastmod should describe the last meaningful content change, not the time a
// file was copied. For every URL we use the page's own JSON-LD dateModified
// when it is present and plausible; otherwise we fall back to the date of the
// last git commit that touched the source file. Missing files are a hard error
// so the sitemap can never advertise a URL that does not exist in the repo.
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.join(__dirname, "..");
const sitemapPath = path.join(root, "sitemap.xml");
const origin = "https://popuploom.com";
const today = new Date().toISOString().slice(0, 10);

function sourceFile(loc) {
  const pathname = new URL(loc).pathname;
  if (pathname === "/") return "index.html";
  const relative = decodeURIComponent(pathname).replace(/^\/+/, "");
  return pathname.endsWith("/") ? relative + "index.html" : relative;
}

function schemaDate(file) {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) return null;
  const html = fs.readFileSync(full, "utf8");
  const dates = [...html.matchAll(/"dateModified"\s*:\s*"(\d{4}-\d{2}-\d{2})"/g)].map((m) => m[1]);
  if (!dates.length) return null;
  return dates.sort().at(-1);
}

function gitDate(file) {
  try {
    const out = execFileSync("git", ["log", "-1", "--format=%cs", "--", file], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(out) ? out : null;
  } catch (e) {
    return null;
  }
}

function fileDate(file) {
  try {
    return fs.statSync(path.join(root, file)).mtime.toISOString().slice(0, 10);
  } catch (e) {
    return null;
  }
}

const xml = fs.readFileSync(sitemapPath, "utf8");
const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
if (!locs.length) throw new Error("sitemap.xml has no <loc> entries");

const seen = new Set();
const rows = [];
const problems = [];
for (const loc of locs) {
  if (seen.has(loc)) problems.push("duplicate URL: " + loc);
  seen.add(loc);
  if (!loc.startsWith(origin + "/")) problems.push("non-canonical origin: " + loc);

  const file = sourceFile(loc);
  if (!fs.existsSync(path.join(root, file))) {
    problems.push("missing source file for " + loc + ": " + file);
    rows.push({ loc, lastmod: null });
    continue;
  }

  const fromSchema = schemaDate(file);
  let lastmod = fromSchema && fromSchema <= today ? fromSchema : null;
  if (fromSchema && fromSchema > today) problems.push("future dateModified in " + file + ": " + fromSchema);
  if (!lastmod) lastmod = gitDate(file) || fileDate(file);
  if (lastmod > today) lastmod = today;
  if (!lastmod) problems.push("no date available for " + file);
  rows.push({ loc, lastmod });
}

if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}

const body = rows
  .map(({ loc, lastmod }) => "  <url><loc>" + loc + "</loc><lastmod>" + lastmod + "</lastmod></url>")
  .join("\n");
const next = '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  body + "\n</urlset>\n";

if (next === xml) {
  console.log("sitemap.xml already has lastmod on all " + rows.length + " URLs");
} else {
  fs.writeFileSync(sitemapPath, next);
  console.log("updated sitemap.xml: " + rows.length + " URLs with lastmod");
}
for (const { loc, lastmod } of rows) console.log(lastmod + "  " + loc);
