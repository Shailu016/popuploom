// scripts/csp-hashes.js — precompute per-file CSP script hashes for the Worker
// (same regexes as server/security.js). Re-run after editing inline scripts
// or inline event handlers in any HTML file: node scripts/csp-hashes.js
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const root = path.join(__dirname, "..");
// Scan every served HTML file instead of keeping a hand-maintained list.
// A new guide or template category page can no longer ship with an inline
// JSON-LD block missing its hash.
const htmlFiles = [];
for (const dir of ["", "guides", "templates", "alternatives"]) {
  const full = path.join(root, dir);
  if (!fs.existsSync(full)) continue;
  for (const file of fs.readdirSync(full)) {
    if (file.endsWith(".html")) htmlFiles.push(dir ? dir + "/" + file : file);
  }
}
htmlFiles.sort();
const hash = text => "'sha256-" + crypto.createHash("sha256").update(text).digest("base64") + "'";

const out = {};
for (const file of htmlFiles) {
  const html = fs.readFileSync(path.join(__dirname, "..", file), "utf8").replace(/\r\n?/g, "\n");
  const hashes = new Set();
  for (const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) if (match[1].trim()) hashes.add(hash(match[1]));
  for (const match of html.matchAll(/\bon[a-z]+\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)) hashes.add(hash(match[1] === undefined ? match[2] : match[1]));
  out[file] = [...hashes].join(" ");
}

fs.writeFileSync(path.join(__dirname, "..", "worker", "csp-hashes.json"), JSON.stringify(out, null, 2) + "\n");
console.log("wrote worker/csp-hashes.json");
