// scripts/csp-hashes.js — precompute per-file CSP script hashes for the Worker
// (same regexes as server/security.js). Re-run after editing inline scripts
// or inline event handlers in any HTML file: node scripts/csp-hashes.js
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const htmlFiles = ["index.html", "faq.html", "press.html", "security.html", "studio.html", "profile.html", "demo.html", "templates.html", "guides/install-popups.html", "guides/index.html", "guides/wordpress-popup.html", "guides/shopify-popup.html", "guides/webflow-popup.html", "guides/collect-and-export-leads.html", "guides/popup-not-showing.html", "guides/popup-builder-for-ecommerce.html", "guides/popup-builder-for-quick-commerce.html", "guides/popup-builder-for-lead-generation.html", "migration.html", "reset-password.html", "leads.html", "privacy.html", "about.html", "contact.html", "terms.html"];
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
