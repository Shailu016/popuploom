/* Shared <head> markup for self-hosted fonts, and a one-off swap for the pages
   the content-page enhancer does not manage (home page and app pages).
   Run: node scripts/fonts-links.cjs   (safe to repeat) */
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");

function manifest() {
  const p = path.join(root, "assets", "fonts", "manifest.json");
  if (!fs.existsSync(p)) throw new Error("assets/fonts/manifest.json missing; run node scripts/self-host-fonts.cjs");
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

/* Preload only what every page needs above the fold: headings and body text. */
function preloadLinks() {
  const faces = manifest();
  const pick = (family) => faces.find((f) => f.family === family && f.style === "normal");
  return ["Bricolage Grotesque", "Geist"].map(pick).filter(Boolean)
    .map((f) => `<link rel="preload" href="/assets/fonts/${f.file}" as="font" type="font/woff2" crossorigin>`).join("");
}

const MARK = /<!--pl:fonts-->[\s\S]*?<!--\/pl:fonts-->\n?/;
const GOOGLE = [
  /<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com">\s*/g,
  /<link rel="preconnect" href="https:\/\/fonts\.gstatic\.com" crossorigin>\s*/g,
  /<link href="https:\/\/fonts\.googleapis\.com\/css2[^"]*" rel="stylesheet">\s*/g
];

function swap(html) {
  let s = html;
  const links = `<!--pl:fonts-->${preloadLinks()}<!--/pl:fonts-->`;
  if (MARK.test(s)) return s.replace(MARK, () => links + "\n");
  let changed = false;
  GOOGLE.forEach((re) => { if (re.test(s)) { changed = true; s = s.replace(re, ""); } });
  if (!changed) return s;
  return s.replace("</head>", () => links + "\n</head>");
}

module.exports = { preloadLinks, swap };

if (require.main === module) {
  const files = ["index.html", "studio.html", "profile.html", "reset-password.html", "verify-email.html"];
  for (const f of files) {
    const abs = path.join(root, f);
    if (!fs.existsSync(abs)) continue;
    const raw = fs.readFileSync(abs, "utf8");
    const crlf = raw.includes("\r\n");
    const next = swap(raw.replace(/\r\n/g, "\n"));
    if (next !== raw.replace(/\r\n/g, "\n")) { fs.writeFileSync(abs, crlf ? next.replace(/\n/g, "\r\n") : next); console.log("updated", f); }
  }
}
