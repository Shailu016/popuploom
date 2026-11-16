// scripts/generate-swipe-txt.cjs — build tools/popup-copy-swipe-file.txt from the
// visible pattern blocks on tools/popup-copy-swipe-file.html. One source keeps
// the download and the page from drifting apart.
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const source = path.join(root, "tools", "popup-copy-swipe-file.html");
const target = path.join(root, "tools", "popup-copy-swipe-file.txt");
const html = fs.readFileSync(source, "utf8");

function decode(text) {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

function text(html) {
  return decode(html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

const main = (html.match(/<main[\s\S]*<\/main>/i) || [""])[0];
if (!main) throw new Error("could not find <main> in " + source);

const categories = new Set([
  "welcome", "email", "exit", "operations", "waitlist", "proof", "seasonal", "feedback"
]);
const rows = [];
let category = "";
const tokens = main.matchAll(/<h2 id="([^"]+)"[^>]*>([\s\S]*?)<\/h2>|<article class="swipe-card">([\s\S]*?)<\/article>/g);
for (const token of tokens) {
  if (token[1] !== undefined) {
    if (categories.has(token[1])) category = text(token[2]);
    continue;
  }
  const block = token[3] || "";
  const heading = block.match(/<h3>([\s\S]*?)<\/h3>/i);
  const pre = block.match(/<pre class="swipe-pre"[^>]*>([\s\S]*?)<\/pre>/i);
  if (!heading || !pre) continue;
  rows.push({
    category: category || "Popup copy patterns",
    title: text(heading[1]),
    copy: decode(pre[1]).replace(/^\n+|\n+$/g, "")
  });
}

if (!rows.length) throw new Error("no swipe patterns found");

const lines = [
  "PopupLoom popup copy swipe file",
  "24 reusable patterns across 8 popup jobs",
  "Last updated: 16 November 2026",
  "Canonical page: https://popuploom.com/tools/popup-copy-swipe-file.html",
  "",
  "These are structural patterns, not tested conversion claims. Replace every",
  "[PLACEHOLDER] with a true fact. PopupLoom has not run an A/B test on every",
  "pattern and does not claim a conversion rate for any of them. Check the",
  "consumer-protection, advertising, privacy and consent rules that apply to",
  "your business before publishing. This file is not legal advice.",
  ""
];

let lastCategory = "";
for (const row of rows) {
  if (row.category !== lastCategory) {
    lines.push("================================================================================");
    lines.push(row.category.toUpperCase());
    lines.push("================================================================================");
    lines.push("");
    lastCategory = row.category;
  }
  lines.push(row.title);
  lines.push("");
  lines.push(row.copy);
  lines.push("");
}

fs.writeFileSync(target, lines.join("\n").replace(/\n+$/, "\n"));
console.log("wrote " + path.relative(root, target) + " with " + rows.length + " patterns");
