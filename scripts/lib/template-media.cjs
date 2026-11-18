/* Template preview media for the public template pages.

   Every template has a captured preview in assets/templates (see
   scripts/capture-template-previews.cjs). This module turns one into:
     - a responsive <picture> with explicit dimensions (no layout shift),
     - Open Graph / Twitter image tags pointing at the template itself
       instead of the generic site card,
     - an ImageObject for JSON-LD.
   applyToDetailPage() is idempotent so it can run after any generator. */
const fs = require("fs");
const path = require("path");

const SITE = "https://popuploom.com";
const root = path.resolve(__dirname, "..", "..");

function esc(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function hasPreview(id) {
  return fs.existsSync(path.join(root, "assets", "templates", id + ".webp"));
}

function altFor(t) {
  return `${t.name} popup template preview: ${t.blurb.replace(/\.$/, "")}`;
}

/* lazy=false for the one above-the-fold image on a page (better LCP). */
function pictureHTML(t, opts) {
  const o = opts || {};
  const lazy = o.lazy !== false;
  const sizes = o.sizes || "(max-width: 700px) 100vw, 380px";
  return `<img class="tpl-shot-img" src="/assets/templates/${t.id}.webp" srcset="/assets/templates/${t.id}-600.webp 600w, /assets/templates/${t.id}.webp 1200w" sizes="${sizes}" width="1200" height="750" alt="${esc(altFor(t))}"${lazy ? ' loading="lazy"' : ' fetchpriority="high"'} decoding="async">`;
}

function imageObject(t) {
  return { "@type": "ImageObject", url: `${SITE}/assets/templates/${t.id}.jpg`, width: 1200, height: 750, caption: altFor(t) };
}

/* Replace the generic social card with the template's own preview. */
function setSocialImage(html, t) {
  const img = `${SITE}/assets/templates/${t.id}.jpg`;
  const alt = esc(altFor(t));
  html = html.replace(/<meta property="og:image" content="[^"]*">/, `<meta property="og:image" content="${img}">`);
  html = html.replace(/<meta property="og:image:alt" content="[^"]*">/, `<meta property="og:image:alt" content="${alt}">`);
  html = html.replace(/<meta name="twitter:image" content="[^"]*">/, `<meta name="twitter:image" content="${img}">`);
  if (!/og:image:width/.test(html)) {
    html = html.replace(/(<meta property="og:image:alt" content="[^"]*">)/, `$1\n<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="750">`);
  }
  return html;
}

function featuredId(html) {
  const ids = Array.from(html.matchAll(/studio\.html\?tpl=([A-Za-z0-9_-]+)/g)).map((m) => m[1]).filter((id) => id !== "blank");
  return ids[0] || null;
}

const FIG_START = "<!-- template-preview -->";
const FIG_END = "<!-- /template-preview -->";

function applyToDetailPage(file, catalog) {
  let html = fs.readFileSync(file, "utf8");
  const crlf = html.includes("\r\n");
  html = html.replace(/\r\n/g, "\n");
  const id = featuredId(html);
  const t = id && catalog.templates.find((x) => x.id === id);
  if (!t) throw new Error(path.basename(file) + ": featured template not found in catalog (" + id + ")");
  if (!hasPreview(t.id)) throw new Error("Missing preview image for " + t.id + "; run scripts/capture-template-previews.cjs");

  html = setSocialImage(html, t);

  // Article JSON-LD gets the preview as its image.
  html = html.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/, (whole, json) => {
    let data;
    try { data = JSON.parse(json); } catch (e) { return whole; }
    const nodes = Array.isArray(data["@graph"]) ? data["@graph"] : [data];
    const article = nodes.find((n) => n["@type"] === "Article");
    if (!article) return whole;
    article.image = imageObject(t);
    return `<script type="application/ld+json">${JSON.stringify(data)}</script>`;
  });

  // One preview figure right after the H1 intro line.
  const figure = `${FIG_START}<figure class="tpl-shot tpl-shot-hero">${pictureHTML(t, { lazy: false, sizes: "(max-width: 900px) 100vw, 848px" })}<figcaption><strong>${esc(t.name)}</strong> · ${esc(t.tag)}. ${esc(t.blurb)} <a href="/studio.html?tpl=${t.id}">Open it in the studio</a>.</figcaption></figure>${FIG_END}`;
  if (html.includes(FIG_START)) {
    html = html.replace(new RegExp(FIG_START + "[\\s\\S]*?" + FIG_END), figure);
  } else {
    const h1 = html.indexOf("</h1>");
    if (h1 === -1) throw new Error(path.basename(file) + ": no <h1>");
    // After the first paragraph that follows the H1 (the "free to edit" line), else right after the H1.
    const after = html.indexOf("</p>", h1);
    const nextHeading = html.indexOf("<h2", h1);
    const at = after !== -1 && (nextHeading === -1 || after < nextHeading) ? after + 4 : h1 + 5;
    html = html.slice(0, at) + "\n    " + figure + html.slice(at);
  }
  fs.writeFileSync(file, crlf ? html.replace(/\n/g, "\r\n") : html);
  return t.id;
}

function detailPages() {
  const dir = path.join(root, "templates");
  return fs.readdirSync(dir)
    .filter((f) => /-(popup|bar)\.html$/.test(f))
    .map((f) => path.join(dir, f));
}

module.exports = { esc, altFor, pictureHTML, imageObject, setSocialImage, applyToDetailPage, detailPages, hasPreview, SITE };

if (require.main === module) {
  const { loadCatalog } = require("./catalog.cjs");
  const catalog = loadCatalog();
  for (const file of detailPages()) console.log(path.basename(file), "->", applyToDetailPage(file, catalog));
}
