// Read-only SEO audit of the public site. No secrets, no writes to production.
// Usage: node scripts/seo-audit.cjs [origin]
const ORIGIN = (process.argv[2] || "https://popuploom.com").replace(/\/+$/, "");
const OUT = process.argv[3] || "";

function text(html) {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#\d+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
function attr(tag, name) {
  const m = tag.match(new RegExp(name + '\\s*=\\s*"([^"]*)"', "i")) || tag.match(new RegExp(name + "\\s*=\\s*'([^']*)'", "i"));
  return m ? m[1] : "";
}
function meta(html, key, value) {
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const k = attr(tag, key).toLowerCase();
    if (k === value.toLowerCase()) return attr(tag, "content");
  }
  return "";
}
function jsonLd(html) {
  const out = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    try {
      const parsed = JSON.parse(m[1]);
      const walk = (v) => {
        if (!v) return;
        if (Array.isArray(v)) return v.forEach(walk);
        if (typeof v === "object") {
          if (v["@type"]) out.push(Array.isArray(v["@type"]) ? v["@type"].join(",") : String(v["@type"]));
          Object.keys(v).forEach((k) => { if (k !== "@context") walk(v[k]); });
        }
      };
      walk(parsed);
    } catch (e) { out.push("INVALID_JSON"); }
  }
  return out;
}

async function get(url) {
  const res = await fetch(url, { headers: { "User-Agent": "PopupLoom-SEO-Audit/1.0" }, redirect: "follow" });
  return { status: res.status, url: res.url, type: res.headers.get("content-type") || "", text: await res.text() };
}

(async () => {
  const sitemap = await get(ORIGIN + "/sitemap.xml");
  const locs = [...sitemap.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  const pages = [];
  for (const loc of locs) {
    // The sitemap always lists production URLs. Fetch each path from the
    // origin under audit so a local or staging run audits that build, not
    // the live site. Reported URLs stay canonical.
    let target = loc;
    try { const u = new URL(loc); target = ORIGIN + u.pathname + u.search; } catch (e) {}
    const r = await get(target);
    if (r.type.indexOf("html") === -1) {
      pages.push({ url: loc, status: r.status, error: "not html: " + r.type });
      continue;
    }
    const h = r.text;
    const titleTag = (h.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "";
    const title = text(titleTag);
    const desc = meta(h, "name", "description");
    const robots = meta(h, "name", "robots");
    const canonical = (() => {
      const tags = h.match(/<link\b[^>]*>/gi) || [];
      for (const tag of tags) if (attr(tag, "rel").toLowerCase() === "canonical") return attr(tag, "href");
      return "";
    })();
    const h1 = [...h.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => text(m[1]));
    const h2 = [...h.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi)].map((m) => text(m[1]));
    const imgs = h.match(/<img\b[^>]*>/gi) || [];
    const missingAlt = imgs.filter((tag) => !/\balt\s*=/i.test(tag)).length;
    const internal = new Set();
    for (const m of h.matchAll(/<a\b[^>]*href=["']([^"']+)["']/gi)) {
      const href = m[1];
      if (href.startsWith("/") || href.startsWith(ORIGIN)) {
        const path = href.startsWith(ORIGIN) ? new URL(href).pathname : href.split("#")[0].split("?")[0];
        if (path && path !== "/" && !/\.(png|jpe?g|webp|svg|css|js|xml|txt|ico)$/i.test(path)) internal.add(path);
      }
    }
    const words = text(h).split(" ").filter(Boolean).length;
    pages.push({
      // final is reported on the production host so redirects are judged the same locally.
      url: loc, status: r.status, final: r.url.indexOf(ORIGIN) === 0 ? new URL(loc).origin + r.url.slice(ORIGIN.length) : r.url, title, titleLen: title.length,
      desc, descLen: desc.length, robots, canonical, wordCount: words,
      h1, h1Count: h1.length, h2Count: h2.length, missingAlt, imgCount: imgs.length,
      internalLinks: internal.size, schema: [...new Set(jsonLd(h))],
      ogTitle: meta(h, "property", "og:title"), ogImage: meta(h, "property", "og:image"),
      twitterCard: meta(h, "name", "twitter:card"),
      lang: attr((h.match(/<html\b[^>]*>/i) || [""])[0], "lang")
    });
  }

  // Duplicate titles/descriptions and thin/oversized metadata.
  const byTitle = {}, byDesc = {};
  for (const p of pages) {
    if (p.title) (byTitle[p.title] = byTitle[p.title] || []).push(p.url);
    if (p.desc) (byDesc[p.desc] = byDesc[p.desc] || []).push(p.url);
  }
  const issues = [];
  for (const p of pages) {
    if (p.status !== 200) issues.push(["status " + p.status, p.url]);
    if (!p.title) issues.push(["missing title", p.url]);
    else if (p.titleLen < 30) issues.push(["short title (" + p.titleLen + ")", p.url]);
    else if (p.titleLen > 65) issues.push(["long title (" + p.titleLen + ")", p.url]);
    if (!p.desc) issues.push(["missing description", p.url]);
    else if (p.descLen < 70) issues.push(["short description (" + p.descLen + ")", p.url]);
    else if (p.descLen > 165) issues.push(["long description (" + p.descLen + ")", p.url]);
    if (p.h1Count !== 1) issues.push(["h1 count " + p.h1Count, p.url]);
    if (p.wordCount < 400 && !/\/contact\.html$/.test(p.url)) issues.push(["thin content (" + p.wordCount + " words)", p.url]);
    if (p.missingAlt) issues.push([p.missingAlt + " images without alt", p.url]);
    if (byTitle[p.title] && byTitle[p.title].length > 1) issues.push(["duplicate title", p.url]);
    if (byDesc[p.desc] && byDesc[p.desc].length > 1) issues.push(["duplicate description", p.url]);
    if (!p.canonical) issues.push(["missing canonical", p.url]);
    if (p.canonical && p.canonical.replace(/\/$/, "") !== p.final.replace(/\/$/, "")) issues.push(["canonical mismatch: " + p.canonical, p.url]);
    if (/noindex/i.test(p.robots)) issues.push(["noindex on sitemap page", p.url]);
    if (!p.schema.length) issues.push(["no structured data", p.url]);
    if (!p.ogTitle) issues.push(["missing og:title", p.url]);
  }

  const report = { origin: ORIGIN, generatedAt: new Date().toISOString(), sitemapStatus: sitemap.status, pageCount: pages.length, issues, pages };
  const json = JSON.stringify(report, null, 2);
  if (OUT) require("fs").writeFileSync(OUT, json + "\n");
  console.log(json);
})().catch((e) => { console.error(e); process.exit(1); });
