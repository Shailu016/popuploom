/* Site chrome and reading layout for every public content page.

   Why this exists: visitors who arrive from search land on a guide, not the
   home page. Those pages used to be plain text under a plain link row: no web
   fonts, no brand, no call to action, no visual, no table of contents, no
   next step. This script gives them one consistent shell:

     every public page   sticky site nav with a CTA, display fonts, footer
     guides + template   hero with a template preview, reading time, sticky
     detail pages        table of contents, inline and closing calls to action,
                         related template cards and related guides

   It is idempotent. Everything it generates sits between <!--pl:name--> markers
   and is rebuilt on each run, so edit this file, not the pages, to change the
   design. Run it after the template page generators:
     node scripts/generate-template-pages.cjs
     node scripts/enhance-content-pages.cjs
     node scripts/csp-hashes.js

   AdSense safety: the layout never moves, wraps or hides the ad unit. The
   injector still places one unit before the last </article>; every
   interactive card sits in the closing block after the article, separated
   from the ad by a wide gap. Nothing here is sticky at the bottom of the
   screen, and no CTA is placed next to an ad. */
const fs = require("fs");
const path = require("path");
const { loadCatalog, root } = require("./lib/catalog.cjs");
const media = require("./lib/template-media.cjs");

const catalog = loadCatalog();
const byId = Object.fromEntries(catalog.templates.map((t) => [t.id, t]));
const COUNT = catalog.templates.length;

/* ------------------------------------------------------------------ pages */
const read = (p) => fs.readFileSync(p, "utf8").replace(/\r\n/g, "\n");
const list = (dir, re) => fs.existsSync(path.join(root, dir)) ? fs.readdirSync(path.join(root, dir)).filter((f) => re.test(f)).map((f) => (dir ? dir + "/" : "") + f) : [];

const docGuides = list("guides", /\.html$/).filter((f) => f !== "guides/index.html");
const docTemplates = list("templates", /-(popup|bar)\.html$/);
const DOC = new Set([...docGuides, ...docTemplates]);
const CHROME_ONLY = [
  ...list("guides", /^index\.html$/), "templates.html", ...list("templates", /\.html$/).filter((f) => !DOC.has(f)),
  ...list("tools", /\.html$/), "about.html", "faq.html", "press.html", "security.html", "contact.html", "terms.html", "privacy.html",
  "best-free-popup-builder.html", "free-popup-builder-no-limits.html"
].filter((f) => fs.existsSync(path.join(root, f)));

/* What each guide shows in its hero: a template id, or a product screenshot. */
const SHOTS = {
  studio: { src: "/assets/guides/studio-editor-desktop.webp", w: 1366, h: 900, alt: "The PopupLoom studio editing a popup with the live preview beside the controls", cap: "The PopupLoom studio: edit the popup, watch the preview." },
  inbox: { src: "/assets/guides/lead-inbox-demo.webp", w: 1366, h: 900, alt: "The PopupLoom lead inbox showing sample rows", cap: "The lead inbox, shown with sample rows." }
};
/* In-context scenes (scripts/capture-guide-heroes.cjs): a popup over a sample page. */
const scene = (name, tplId, alt, cap) => ({ src: `/assets/guides/scene-${name}.webp`, small: `/assets/guides/scene-${name}-600.webp`, w: 1200, h: 750, alt, cap, tplId });
Object.assign(SHOTS, {
  "scene-store": scene("store", "drop48", "A sample online store page with a discount popup showing a countdown and a code field over it (illustration)", "A discount popup over a sample store page."),
  "scene-grocery": scene("grocery", "barnews", "A sample grocery delivery page with a notice bar across the top asking visitors to check their area (illustration)", "A notice bar over a sample grocery page."),
  "scene-blog": scene("blog", "leadShelf", "A sample blog article with a corner slide-in offering a free guide for an email address (illustration)", "A corner signup over a sample article."),
  "scene-cart": scene("cart", "cartRescue", "A sample shopping cart page with an exit-intent popup holding a shipping and discount offer (illustration)", "A cart-rescue popup over a sample cart page."),
  "scene-welcome": scene("welcome", "firstCode", "A sample online store page with a first-order signup popup asking for an email address (illustration)", "A welcome signup over a sample store page.")
});
const GUIDE_VISUAL = {
  "popup-builder-for-quick-commerce": "scene-grocery", "popup-builder-for-ecommerce": "scene-store", "popup-builder-for-lead-generation": "scene-blog",
  "exit-intent-popup": "scene-cart", "email-signup-popup": "scene-welcome", "collect-and-export-leads": "inbox"
};
const GUIDE_TEMPLATES = {
  "popup-builder-for-quick-commerce": ["launchDay", "barnews", "firstCode"],
  "popup-builder-for-ecommerce": ["drop48", "cartRescue", "freeship"],
  "popup-builder-for-lead-generation": ["leadShelf", "guideSplit", "webinarSeat"],
  "exit-intent-popup": ["fullscreenExit", "cartRescue", "exitOnly"],
  "email-signup-popup": ["firstCode", "welcomeHero", "waitlist"],
  "collect-and-export-leads": ["leadShelf", "waitlist", "smsPass"]
};
const FALLBACK_TEMPLATES = ["drop48", "firstCode", "tapMeter"];

const CLUSTERS = [
  ["guides/popup-builder-for-ecommerce.html", "guides/popup-builder-for-quick-commerce.html", "guides/popup-builder-for-lead-generation.html", "guides/exit-intent-popup.html", "guides/email-signup-popup.html", "guides/collect-and-export-leads.html", "guides/popup-not-showing.html", "guides/free-popup-builders-without-pageview-limits.html"],
  ["guides/install-popups.html", "guides/wordpress-popup.html", "guides/shopify-popup.html", "guides/webflow-popup.html", "guides/squarespace-wix-popup.html", "guides/nextjs-popup.html", "guides/react-popup.html", "guides/astro-popup.html", "guides/google-tag-manager-popup.html", "guides/static-html-popup.html", "guides/bigcommerce-popup.html", "guides/wordpress-popup-without-plugin.html"],
  docTemplates
];

/* ----------------------------------------------------------------- pieces */
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const stripTags = (s) => s.replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, " ").replace(/&[a-z#0-9]+;/g, " ").replace(/\s+/g, " ").trim();
const slug = (s) => s.toLowerCase().replace(/&[a-z#0-9]+;/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "section";

const indexHtml = read(path.join(root, "index.html"));
const LOGO = (indexHtml.match(/<a class="logo" href="[^"]*">[\s\S]*?<\/a>/) || [])[0];
if (!LOGO) throw new Error("Could not find the logo markup in index.html");
const LOGO_HTML = LOGO.replace(/href="[^"]*"/, 'href="/"');

const NAV = `<!--pl:nav--><a class="skip-link" href="#main">Skip to content</a><nav class="site-nav" aria-label="Main"><div class="wrap inner">${LOGO_HTML}<div class="nav-links"><a href="/templates.html">Templates</a><a href="/guides/">Guides</a><a href="/tools/">Tools</a><a href="/free-popup-builder-no-limits.html">No limits</a><a href="/faq.html">FAQ</a></div><div class="nav-cta"><a class="btn primary small" href="/studio.html?tpl=blank">Open the studio</a></div></div></nav><div class="pl-progress" aria-hidden="true"><i></i></div><!--/pl:nav-->`;

const fontsLinks = require("./fonts-links.cjs");
// Self-hosted fonts (scripts/self-host-fonts.cjs): preload the two faces every page needs.
const FONTS = `<!--pl:fonts-->${fontsLinks.preloadLinks()}<!--/pl:fonts-->`;

const FOOTER = `<!--pl:footer--><footer class="site-foot"><div class="wrap"><div class="foot-grid">
<div class="foot-brand">${LOGO_HTML}<p>A free website popup builder with ${COUNT} editable templates, a visual studio and a lead inbox. No pageview cap, no credit card.</p><p><a class="btn primary small" href="/studio.html?tpl=blank">Open the studio</a></p></div>
<div><p class="foot-h">Product</p><ul><li><a href="/studio.html?tpl=blank">Popup studio</a></li><li><a href="/templates.html">All ${COUNT} templates</a></li><li><a href="/tools/">Free tools</a></li><li><a href="/free-popup-builder-no-limits.html">No pageview limits</a></li><li><a href="/best-free-popup-builder.html">Nine-point checklist</a></li></ul></div>
<div><p class="foot-h">Guides</p><ul><li><a href="/guides/install-popups.html">Add a popup to your site</a></li><li><a href="/guides/wordpress-popup.html">WordPress</a></li><li><a href="/guides/shopify-popup.html">Shopify</a></li><li><a href="/guides/webflow-popup.html">Webflow</a></li><li><a href="/guides/popup-builder-for-ecommerce.html">Ecommerce</a></li><li><a href="/guides/">All guides</a></li></ul></div>
<div><p class="foot-h">Company</p><ul><li><a href="/about.html">About</a></li><li><a href="/faq.html">FAQ</a></li><li><a href="/contact.html">Contact</a></li><li><a href="/security.html">Security</a></li><li><a href="/press.html">Press kit</a></li><li><a href="/privacy.html">Privacy</a></li><li><a href="/terms.html">Terms</a></li></ul></div>
</div><p class="foot-legal">PopupLoom is an independent product. Template offers, codes and countdowns are sample copy; every claim a site publishes must be true and is the site owner's responsibility.</p></div></footer><!--/pl:footer-->`;

const SCRIPT = `<!--pl:script--><script>
(function () {
  var bar = document.querySelector(".pl-progress i"), nav = document.querySelector(".site-nav");
  function tick() {
    var d = document.documentElement, max = d.scrollHeight - innerHeight, p = max > 0 ? scrollY / max : 0;
    if (bar) bar.style.transform = "scaleX(" + Math.min(1, Math.max(0, p)) + ")";
    if (nav) nav.classList.toggle("scrolled", scrollY > 8);
  }
  addEventListener("scroll", tick, { passive: true });
  tick();
  var links = document.querySelectorAll(".doc-aside .doc-toc a");
  if (!links.length || !("IntersectionObserver" in window)) return;
  var map = {};
  links.forEach(function (a) { map[a.getAttribute("href").slice(1)] = a; });
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      links.forEach(function (a) { a.classList.remove("on"); });
      var a = map[e.target.id];
      if (a) a.classList.add("on");
    });
  }, { rootMargin: "-80px 0px -70% 0px" });
  Object.keys(map).forEach(function (id) { var el = document.getElementById(id); if (el) io.observe(el); });
})();
</script><!--/pl:script-->`;

const region = (name) => new RegExp(`<!--pl:${name}-->[\\s\\S]*?<!--/pl:${name}-->\\n?`, "g");

/* --------------------------------------------------------------- transforms */
function cleanGenerated(html) {
  // Put a previously enhanced doc page back into its plain form so it can be rebuilt.
  html = html.replace('<article class="doc-body">', "<article>");
  const hero = html.match(/<!--pl:hero-->([\s\S]*?)<!--\/pl:hero-->/);
  if (hero) {
    const crumb = (hero[1].match(/<nav\b[^>]*aria-label="Breadcrumb"[^>]*>[\s\S]*?<\/nav>/) || [""])[0];
    const h1 = (hero[1].match(/<h1>[\s\S]*?<\/h1>/) || [""])[0];
    let by = (hero[1].match(/<p class="mut doc-byline"[^>]*>[\s\S]*?<\/p>/) || hero[1].match(/<div class="[a-z-]*meta doc-byline">[\s\S]*?<\/div>/) || [""])[0];
    by = by.replace(/ · <span class="doc-rt">[\s\S]*?<\/span>/, "").replace(/<span class="doc-rt">[\s\S]*?<\/span>/, "").replace(" doc-byline", "");
    if (by.indexOf("By ") === -1 && by.indexOf("Shailu") === -1) by = "";
    html = html.replace(region("hero"), "");
    html = html.replace(/<article>\n?/, `${crumb ? "" : ""}<article>\n    ${h1}\n    ${by}\n`);
    if (crumb) html = html.replace(/<main\b[^>]*>/, (m) => m + "\n  " + crumb);
  }
  for (const name of ["nav", "fonts", "footer", "script", "aside", "toc-m", "inline-cta", "after"]) html = html.replace(region(name), "");
  html = html.replace('<div class="wrap doc-wrap"><div class="doc-grid"><!--pl:grid-->\n', "").replace("<!--/pl:grid--></div></div>", "");
  return html;
}

function head(html) {
  if (!/<!--pl:fonts-->/.test(html)) html = html.replace("</head>", FONTS + "\n</head>");
  return html;
}

function chromeCommon(html) {
  // Old plain header (and its link row); keep any breadcrumb it carried.
  const hdr = html.match(/<header class="wrap"[^>]*>([\s\S]*?)<\/header>\n?/);
  let crumb = "";
  if (hdr) {
    crumb = (hdr[1].match(/<nav\b[^>]*aria-label="Breadcrumb"[^>]*>[\s\S]*?<\/nav>/) || [""])[0];
    html = html.replace(hdr[0], "");
    if (crumb) html = html.replace(/<main\b[^>]*>/, (m) => m + "\n  " + crumb);
  }
  // Link row inside <main> on the legal pages.
  html = html.replace(/\n?\s*<nav aria-label="Main"[^>]*>[\s\S]*?<\/nav>/, "");
  html = html.replace(/<footer\b[\s\S]*?<\/footer>\n?/g, "");
  html = html.replace(/<body([^>]*)>\n?/, (m) => m + NAV + "\n");
  html = html.replace(/<main\b([^>]*)>/, (m, a) => (/\bid=/.test(a) ? m : `<main id="main"${a}>`));
  html = html.replace("</body>", FOOTER + "\n" + SCRIPT + "\n</body>");
  return head(html);
}

function pickTemplates(file, featured) {
  const base = path.basename(file, ".html");
  let ids = (GUIDE_TEMPLATES[base] || []).slice();
  if (featured && byId[featured]) {
    const j = byId[featured].journey;
    for (const t of catalog.templates) if (t.id !== featured && t.journey === j && (t.best || ids.length < 3) && !ids.includes(t.id)) ids.push(t.id);
    ids = ids.filter((i) => i !== featured);
  }
  for (const f of FALLBACK_TEMPLATES) if (ids.length < 3 && !ids.includes(f) && f !== featured) ids.push(f);
  return ids.slice(0, 3).map((i) => byId[i]).filter(Boolean);
}

function relatedPages(file) {
  const cl = CLUSTERS.find((c) => c.includes(file)) || CLUSTERS[0];
  const i = cl.indexOf(file);
  const rotated = cl.slice(i + 1).concat(cl.slice(0, Math.max(0, i)));
  return rotated.filter((f) => f !== file && fs.existsSync(path.join(root, f))).slice(0, 4).map((f) => {
    const h1 = (read(path.join(root, f)).match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1] || path.basename(f, ".html");
    return { href: "/" + f, label: stripTags(h1) };
  });
}

function shotFor(file, featured) {
  const base = path.basename(file, ".html");
  // A clean template preview beats the studio screenshot, which shows a test account name.
  const v = featured || GUIDE_VISUAL[base] || "welcomeHero";
  if (SHOTS[v]) {
    const S = SHOTS[v];
    const srcset = S.small ? ` srcset="${S.small} 600w, ${S.src} 1200w" sizes="(max-width: 1000px) 100vw, 520px"` : "";
    return { html: `<img class="doc-shot-img" src="${S.src}"${srcset} width="${S.w}" height="${S.h}" alt="${esc(S.alt)}" fetchpriority="high" decoding="async">`, cap: S.cap, tpl: S.tplId ? byId[S.tplId] || null : null };
  }
  const t = byId[v];
  if (!t || !media.hasPreview(t.id)) return { html: "", cap: "", tpl: null };
  return { html: media.pictureHTML(t, { lazy: false, sizes: "(max-width: 1000px) 100vw, 520px" }).replace('class="tpl-shot-img"', 'class="doc-shot-img"'), cap: `Preview: ${t.name}`, tpl: t };
}

function tplCard(t) {
  return `<a class="doc-card" href="/studio.html?tpl=${t.id}"><span class="doc-card-img">${media.pictureHTML(t, { sizes: "(max-width: 700px) 100vw, 300px" }).replace('class="tpl-shot-img"', 'class="doc-card-pic"')}</span><span class="doc-card-name">${esc(t.name)}</span><span class="doc-card-tag">${esc(t.tag)}</span><span class="doc-card-go">Open in the studio →</span></a>`;
}

function doc(html, file) {
  const base = path.basename(file, ".html");
  const isTemplatePage = file.startsWith("templates/");
  const m = html.match(/<main\b([^>]*)>\n?([\s\S]*?)<\/main>/);
  if (!m) throw new Error(file + ": no <main>");
  let inner = m[2];
  const art = inner.match(/<article>\n?([\s\S]*)<\/article>/);
  if (!art) throw new Error(file + ": no <article>");
  let body = art[1];
  const crumb = (inner.slice(0, inner.indexOf("<article>")).match(/<nav\b[^>]*aria-label="Breadcrumb"[^>]*>[\s\S]*?<\/nav>/) || [""])[0];
  const h1m = body.match(/<h1>[\s\S]*?<\/h1>/);
  if (!h1m) throw new Error(file + ": no <h1>");
  body = body.replace(h1m[0], "");
  const byM = body.match(/<p class="mut" style="font-size:13px;margin:6px 0 18px">By <a href="\/about\.html">Shailu<\/a>[\s\S]*?<\/p>/) || body.match(/^\s*<div class="[a-z-]*meta">[\s\S]*?<\/div>/);
  const byline = byM ? byM[0] : "";
  if (byM) body = body.replace(byM[0], "");

  // Section anchors and table of contents.
  const used = new Set();
  const toc = [];
  body = body.replace(/<h2(\s[^>]*)?>([\s\S]*?)<\/h2>/g, (all, attrs, text) => {
    attrs = attrs || "";
    let id = (attrs.match(/\sid="([^"]+)"/) || [])[1];
    const label = stripTags(text);
    if (!id) { id = slug(label); let n = 2; const b = id; while (used.has(id)) id = b + "-" + n++; attrs += ` id="${id}"`; }
    used.add(id);
    toc.push({ id, label });
    return `<h2${attrs}>${text}</h2>`;
  });
  const tocItems = toc.filter((x) => !/^(common questions|keep reading|related|faq)/i.test(x.label) || toc.length < 5).slice(0, 12);
  const words = stripTags(body).split(" ").length;
  const mins = Math.max(2, Math.round(words / 210));

  const featuredId = isTemplatePage ? (html.match(/studio\.html\?tpl=([A-Za-z0-9_-]+)/g) || []).map((s) => s.split("=")[1]).find((i) => i !== "blank") : null;
  const feat = featuredId && byId[featuredId] ? byId[featuredId] : null;
  const shot = shotFor(file, feat && feat.id);
  const ctaTpl = shot.tpl || feat;
  const primaryHref = ctaTpl ? `/studio.html?tpl=${ctaTpl.id}` : "/studio.html?tpl=blank";
  const primaryLabel = feat ? `Open ${feat.name} in the studio` : (ctaTpl ? `Try ${ctaTpl.name} in the studio` : "Open the studio, it's free");
  const tpls = pickTemplates(file, feat && feat.id);
  const more = relatedPages(file);

  // Template preview already on a template detail page is replaced by the hero visual.
  body = body.replace(/<!-- template-preview -->[\s\S]*?<!-- \/template-preview -->\s*/g, "");

  const byline2 = byline ? (/^\s*<div/.test(byline)
    ? byline.trim().replace(/^<div class="([a-z-]*meta)">/, '<div class="$1 doc-byline">').replace(/<\/div>$/, `<span class="doc-rt">${mins} min read</span></div>`)
    : byline.replace('<p class="mut"', '<p class="mut doc-byline"').replace(/<\/p>$/, ` · <span class="doc-rt">${mins} min read</span></p>`)) :`<p class="mut doc-byline"><span class="doc-rt">${mins} min read</span></p>`;
  const hero = `<!--pl:hero--><div class="doc-hero"><div class="wrap doc-hero-in"><div class="doc-hero-copy">${crumb}<div class="kicker">${isTemplatePage ? "Template guide" : "Guide"}</div>${h1m[0]}${byline2}<nav class="doc-actions" aria-label="Next steps"><a class="btn primary" href="${primaryHref}">${esc(primaryLabel)}</a><a class="btn ghost" href="/templates.html">Browse ${COUNT} templates</a></nav><p class="doc-trust">Free to use · no credit card · no pageview cap</p></div>${shot.html ? `<aside class="doc-hero-vis"><figure class="doc-shot">${shot.html}<figcaption>${esc(shot.cap)}</figcaption></figure></aside>` : ""}</div></div><!--/pl:hero-->`;

  // Inline call to action before the third section (only on longer pages).
  let inline = "";
  const h2s = [...body.matchAll(/<h2[\s>]/g)];
  const inlineTpl = ctaTpl || byId.welcomeHero;
  if (h2s.length >= 4 && inlineTpl && media.hasPreview(inlineTpl.id)) {
    const at = h2s[2].index;
    inline = `<!--pl:inline-cta--><aside class="doc-inline-cta"><span class="doc-inline-img">${media.pictureHTML(inlineTpl, { sizes: "180px" }).replace('class="tpl-shot-img"', 'class="doc-card-pic"')}</span><div><strong>Try it on your own page</strong><p>Open the ${esc(inlineTpl.name)} template, replace the sample text with your own and preview it on desktop and mobile. Free, no credit card.</p><a class="btn primary small" href="/studio.html?tpl=${inlineTpl.id}">Open it in the studio</a></div></aside><!--/pl:inline-cta-->\n`;
    body = body.slice(0, at) + inline + body.slice(at);
  }

  const tocList = tocItems.map((x) => `<li><a href="#${x.id}">${esc(x.label)}</a></li>`).join("");
  const tocM = tocItems.length >= 3 ? `<!--pl:toc-m--><nav class="doc-toc-m" aria-label="On this page"><details><summary>On this page</summary><ol>${tocList}</ol></details></nav><!--/pl:toc-m-->\n` : "";
  const aside = `<!--pl:aside--><aside class="doc-aside" aria-label="Page tools">${tocItems.length >= 3 ? `<nav class="doc-toc" aria-label="Table of contents"><div class="doc-aside-h">On this page</div><ol>${tocList}</ol></nav>` : ""}${more.length ? `<div class="doc-more"><div class="doc-aside-h">Keep reading</div><ul>${more.map((r) => `<li><a href="${r.href}">${esc(r.label)}</a></li>`).join("")}</ul></div>` : ""}</aside><!--/pl:aside-->`;
  const after = `<!--pl:after--><aside class="doc-after" aria-label="Next steps"><p class="doc-after-h">Start from a template</p><p class="doc-after-sub">Each one opens in the studio. Change the words, colours and trigger, then install it with two lines of code.</p><div class="doc-card-row">${tpls.map(tplCard).join("")}</div><div class="doc-band"><div><p class="doc-band-h">Ready to build your popup?</p><p>The studio is free to use. Save a popup to get its install code and read your leads in the inbox.</p></div><a class="btn primary" href="/studio.html?tpl=blank">Open the studio</a></div></aside><!--/pl:after-->`;

  const grid = `<div class="wrap doc-wrap"><div class="doc-grid"><!--pl:grid-->\n${tocM}<article class="doc-body">\n${body.trim()}\n  </article>\n${aside}\n<!--/pl:grid--></div>${after}</div>`;
  const mainTag = `<main id="main" class="doc">`;
  return html.replace(m[0], `${mainTag}\n${hero}\n${grid}\n</main>`);
}

/* -------------------------------------------------------------------- run */
/* The home page is bespoke: only its footer and font links come from the shared shell. */
function homepage(html) {
  if (/<!--pl:footer-->/.test(html)) html = html.replace(region("footer"), () => FOOTER + "\n");
  else if (/<footer class="foot">/.test(html)) html = html.replace(/<footer class="foot">[\s\S]*?<\/footer>\n?/, () => FOOTER + "\n");
  else throw new Error("index.html: footer not found");
  return fontsLinks.swap(html);
}

let n = 0;
for (const file of [...DOC, ...CHROME_ONLY, "index.html"]) {
  const abs = path.join(root, file);
  const raw = fs.readFileSync(abs, "utf8");
  const crlf = raw.includes("\r\n");
  let html = raw.replace(/\r\n/g, "\n");
  if (file === "index.html") html = homepage(html);
  else {
    html = chromeCommon(cleanGenerated(html));
    if (DOC.has(file)) html = doc(html, file);
  }
  const out = crlf ? html.replace(/\n/g, "\r\n") : html;
  if (out !== raw) { fs.writeFileSync(abs, out); n++; }
}
// App pages keep their own chrome; only their font links change.
for (const file of ["studio.html", "profile.html", "reset-password.html", "verify-email.html"]) {
  const abs = path.join(root, file);
  if (!fs.existsSync(abs)) continue;
  const raw = fs.readFileSync(abs, "utf8");
  const crlf = raw.includes("\r\n");
  const html = fontsLinks.swap(raw.replace(/\r\n/g, "\n"));
  const out = crlf ? html.replace(/\n/g, "\r\n") : html;
  if (out !== raw) { fs.writeFileSync(abs, out); n++; }
}
console.log(`Enhanced ${DOC.size} reading pages, ${CHROME_ONLY.length} chrome-only pages and the home page footer (${n} files changed).`);
