# PopupLoom SEO & organic growth plan

> **Historical internal record — not public copy.** This document names competitors
> on purpose, to preserve the evidence behind past decisions (dates, prices, limits).
> The no-competitor-names rule in `AGENTS.md` applies to public pages and shipped
> copy, not to this file. Do not paste sections of it into site content without
> rewriting them vendor-neutral.

**Created:** 2026-11-14
**Scope:** organic search and product-led growth for `https://popuploom.com`
**Status:** plan. Nothing in this document changes ad eligibility, CSP, injection or
AdSense placements. Those remain governed by `shared/ads.js` and `shared/ad-pages.js`.

---

## 1. Executive summary

PopupLoom is technically clean but commercially invisible in search.

Evidence gathered on 2026-11-14:

- **Search Console (property `sc-domain:popuploom.com`, DNS-verified):**
  - **13 pages indexed, 48 not indexed** (39 `noindex` studio-template URLs,
    3 robots-blocked, 2 redirects, 4 discovered but not crawled).
  - **4 clicks, 35 impressions, 11.4% CTR, average position 24.4** for 1–11 Nov.
    This is not a ranking problem yet; it is an absence-of-participation problem.
  - Sitemap submitted and read successfully: **23 discovered pages**.
  - **0 external links** reported; 63 internal links. Authority is the binding
    constraint.
  - Manual actions: **none**. Security issues: **none**. Breadcrumbs: 6 valid, 0 invalid.
  - The four discovered-but-not-crawled URLs were requested for indexing on
    2026-11-14: `/guides/index.html`, `/guides/popup-not-showing.html`,
    `/guides/webflow-popup.html`, `/terms.html`.
- 23 public HTML URLs are in `sitemap.xml`; all return `200` and are indexable.
- On-page audit found only 11 minor issues, mostly short titles on legal/about pages
  and missing structured data on six low-priority pages.
- `robots.txt`, canonicals, `noindex` on private pages, CSP, HSTS and security headers
  are correct.
- DuckDuckGo's `site:popuploom.com` returns essentially one page (Privacy). Brand and
  product queries return no PopupLoom result. Bing's index also looks empty.
- The 39 “noindex” URLs are all `/studio.html?tpl=...` links from the template gallery.
  They are intentionally private, but they show that the gallery sends every template
  click into a non-indexable URL instead of a public template page.
- The strongest market wedge is verifiable and rare: **free, no pageview or visitor
  cap, no trial, no credit card**, with 45 templates and a two-line install.
  OptinMonster, OptiMonk, Popupsmart, Poptin, Claspo and similar tools meter traffic
  or brand the free tier.

The plan therefore does three things in order:

1. **Get indexed** (technical + Search Console + Bing/IndexNow).
2. **Own the “no limits” wedge and the long tail** (comparison, platform, use-case and
   template pages) before chasing the head term “popup builder”.
3. **Earn authority** (WordPress plugin, GitHub, directories, a free tool, original
   data) so the head term becomes reachable in 12–24 months instead of never.

Realistic expectation: long-tail traffic in 4–8 weeks after indexing, meaningful
non-brand clicks in 3–6 months, and head-term competition in 12–24 months. Anyone who
promises page-one for “popup builder” in 90 days is guessing.

---

## 2. Baseline audit (2026-11-14)

### 2.1 Page inventory

| Page | Title length | Description length | Words | Schema |
|---|---:|---:|---:|---|
| `/` | 43 | 154 | 1294 | Organization, WebSite, SoftwareApplication, FAQ, Offer |
| `/templates.html` | 40 | 151 | 880 | CollectionPage, ItemList, Breadcrumb |
| `/faq.html` | 55 | 156 | 1138 | FAQPage, WebPage, Breadcrumb |
| `/security.html` | 47 | 131 | 1091 | WebPage, Breadcrumb |
| `/press.html` | 47 | 153 | 914 | AboutPage, Organization |
| `/guides/index.html` | 62 | **187** | 420 | CollectionPage, ItemList |
| `/guides/install-popups.html` | 46 | 147 | 825 | TechArticle, HowTo |
| `/guides/wordpress-popup.html` | 54 | 146 | 1405 | Article, FAQ |
| `/guides/shopify-popup.html` | 56 | 138 | 1272 | Article, FAQ |
| `/guides/webflow-popup.html` | 56 | 127 | 970 | Article, FAQ |
| `/guides/squarespace-wix-popup.html` | 60 | 150 | 1113 | Article, FAQ |
| `/guides/exit-intent-popup.html` | 50 | 153 | 839 | Article, FAQ |
| `/guides/email-signup-popup.html` | 51 | 150 | 909 | Article, FAQ |
| `/guides/free-popup-builders-without-pageview-limits.html` | 62 | 142 | 905 | Article, FAQ |
| `/guides/collect-and-export-leads.html` | 42 | 140 | 726 | **none** |
| `/guides/popup-not-showing.html` | 49 | 149 | 876 | **none** |
| `/guides/popup-builder-for-ecommerce.html` | 51 | 136 | 1846 | TechArticle, FAQ |
| `/guides/popup-builder-for-quick-commerce.html` | 49 | 135 | 1937 | TechArticle, FAQ |
| `/guides/popup-builder-for-lead-generation.html` | 46 | 138 | 2067 | TechArticle, FAQ |
| `/about.html` | **15** | 121 | **272** | **none** |
| `/contact.html` | **17** | 111 | 149 | **none** |
| `/terms.html` | **24** | 114 | 436 | **none** |
| `/privacy.html` | 37 | 125 | 649 | **none** |

### 2.2 What is already good

- Clean canonicals on every sitemap URL.
- One `H1` per page; zero images missing `alt`.
- Private surfaces (`studio`, `profile`, `leads`, `migration`, reset/verify) are
  `noindex`, excluded in `robots.txt`, and blocked in the Worker.
- Strict CSP with nonces and `strict-dynamic`; no `unsafe-inline`/`unsafe-eval` in
  `script-src`.
- Ads appear only on the 20 allowlisted public pages and never on private pages.
- `sitemap.xml`, `robots.txt`, `llms.txt`, `openapi.json`, security headers and
  IndexNow key file are all live.
- 45 templates across 10 categories are a large, under-exploited content asset.

### 2.3 Fix list from the audit

| Priority | Issue | Pages | Action |
|---|---|---|---|
| P0 | Homepage does not mention the wedge | `/` | **Done 2026-11-14** — title, description, H1 and hero stat now say “no pageview limits”. |
| P0 | Short titles | About, Contact, Terms | **Done 2026-11-14** — all three rewritten with intent. |
| P0 | Missing structured data | About, Contact, Terms, Privacy, 2 guides | **Done 2026-11-14** — `AboutPage`, `ContactPage`, `WebPage`, `Article` + breadcrumbs. |
| P0 | Template gallery sent every click to `/studio.html?tpl=...` (39 noindex URLs) | Templates | **Done 2026-11-14** — 10 public category pages; 45 cards now point at anchors; studio path kept as the CTA. |
| P1 | Oversized description | Guides hub (187) | Trim to ≤ 160 |
| P1 | Thin about page | About (272 words) | Add real founder/mission/editorial process, no invented credentials |
| P1 | 0 external links | Whole site | Link-earning assets + directories + plugin listings, see §6 |
| P2 | Sitemap has no `lastmod` | All | Add real content dates; do not fake freshness |
| P2 | Internal linking is shallow | All | Homepage and every guide should link to 3–5 relevant pages |
| P2 | No individual template pages | 45 templates | Publish only substantive pages, see §4.3 |

### 2.4 What the Search Console data actually says

- **The site is not ranking; it is barely being served.** 35 impressions in 11 days is
  noise, not a trend. The 11.4% CTR is computed on that tiny sample and should not be
  treated as a real CTR.
- **The pages that already receive impressions are the right first refreshes:**
  homepage (15), templates (11), ecommerce guide (14), about (9), press (9),
  WordPress guide (8), contact (7), collect-and-export (7), privacy (6),
  quick-commerce guide (6).
- **The queries are mostly low-intent or accidental:** “pop up in wordpress”,
  “welcome popup”, “pop up sign up form”, plus one unrelated SEC-filing query that
  should be ignored. There is no meaningful non-brand demand captured yet.
- **Average position 24.4** means the few queries the site appears for are on page 3.
  Small relevance and internal-link improvements can move these before new content is
  needed.
- **Zero external links** is the clearest strategic finding. Content alone will not
  make the site competitive; the plan must include distribution and link earning.
- **The 39 noindex URLs are not a penalty.** They are the template gallery's
  `/studio.html?tpl=...` links. They are correctly noindexed, but they represent a
  missed public-page opportunity and add crawl noise.

### 2.5 Priority correction from the data

Do not start with 45 template pages. Start with:

1. The pages that already have impressions (refresh + internal links).
2. The four discovered URLs (requested 2026-11-14).
3. The “no pageview limits” money page and 3 alternative pages.
4. Then the template hub and first 8 template pages.

### 2.6 Implementation log (2026-11-14)

- Homepage title, description, OG/Twitter copy and H1 now lead with
  “no pageview limits”; the fourth hero stat is “0 pageview caps”.
- About, Contact and Terms titles/descriptions rewritten; About, Contact, Terms,
  Privacy and the two schema-less guides now carry `AboutPage` / `ContactPage` /
  `WebPage` / `Article` plus `BreadcrumbList`.
- Ten public category pages added under `/templates/`:
  `email-signup`, `discount`, `exit-intent`, `announcements`, `engagement`,
  `social-proof`, `age-gates`, `gamified`, `seasonal`, `video`.
- All 45 gallery cards now link to their category page anchor; each category page
  keeps a `Use this template` link to `/studio.html?tpl=<id>`, so the studio flow is
  unchanged.
- `sitemap.xml`, `llms.txt`, Express and Worker public allowlists, CSP hash
  generation and the Cloudflare build all include the new pages.
- Production SEO audit after deploy: **33 URLs, 0 issues** (was 23 URLs, 11 issues).
- IndexNow re-submitted all 33 URLs (HTTP 200). The sitemap URL is unchanged, so
  Search Console will re-read it; the 10 new pages do not need a new sitemap entry.
- Ads are deliberately **not** enabled on the new pages; the allowlist is unchanged.

### 2.7 Second implementation batch (2026-11-14)

- Added `/free-popup-builder-no-limits.html`, a 1,200+ word money page with a
  dated free-tier comparison, an explanation of pageview vs visitor vs impression
  meters, honest “when PopupLoom is wrong” guidance, migration steps and FAQ.
- Added `/alternatives/optinmonster.html`, `/alternatives/poptin.html` and
  `/alternatives/popupsmart.html`, each with a dated, source-linked limit table,
  what the competitor does better, who should switch/stay, migration steps and a
  trademark disclaimer.
- Verified limits on the vendors’ own pricing pages on 2026-11-14:
  OptinMonster free trial 500 campaign impressions with auto-upgrade; Poptin free
  1,000 unique visitors/month on one domain; Popupsmart free 5K pageviews/month,
  one website and one live popup.
- Linked the new pages from the homepage nav/footer, the template category
  footers, the comparison guide and `llms.txt`.
- Regenerated the sitemap, CSP hashes, Express/Worker allowlists and the Cloudflare
  build list.
- Ads remain off on all new pages; no eligibility or injection change.
- Post-deploy audit: **37 URLs, 0 issues**; IndexNow resubmitted all 37.

### 2.8 Third implementation batch (2026-11-14)

- Added `/alternatives/optimonk.html` and `/alternatives/popup-maker.html` with
  verified limits: OptiMonk free 10,000 pageviews/month on one domain; Popup Maker
  free WordPress plugin with unlimited popups and impressions.
- Added `/best-free-popup-builder.html`, an honest six-tool shortlist that names
  Popup Maker as the WordPress-only free option and PopupLoom as the any-site
  no-cap option.
- Added `/guides/wordpress-popup-without-plugin.html`: child-theme `wp_footer`
  placement, the exact snippet, cache/CSP notes, WordPress.com and multisite limits.
- Added the first four individual template pages:
  `/templates/exit-intent-popup.html`, `/templates/discount-popup.html`,
  `/templates/email-signup-popup.html`, `/templates/spin-to-win-popup.html`.
  Each has unique copy examples, setup steps, measurement guidance and mistakes.
- Category pages now link to the four full template guides.
- Added `scripts/seo-scorecard.cjs` and `npm run seo:scorecard`; it records site
  health and optional GSC CSV totals in `docs/SEO_SCORECARD.md` and
  `docs/seo-scorecard-history.json`.
- Sitemap now has 45 URLs. Ads remain off on all new pages.

### 2.9 Bing and Search Console status (2026-11-14)

- **Bing Webmaster:** `popuploom.com` is active in the account. The sitemap was
  resubmitted and now reports **Success, 45 URLs discovered**. URL Submission
  accepted all 45 URLs, and IndexNow shows the same URLs with source “Self”.
- **Bing Site Scan:** the only error bucket is “Blocked by robots.txt” (48 pages),
  which is expected because `/studio.html` and the other private surfaces are
  intentionally disallowed.
- **Google Search Console:** indexing was requested for the money page, best-free
  page, WordPress-without-plugin guide, four individual template pages, OptiMonk
  and Popup Maker. One later request returned a temporary submission error after
  the daily volume, so the rest rely on the sitemap and IndexNow.
- GSC still shows 23 discovered pages from its 13 November read; the sitemap is
  unchanged, so the next scheduled read should pick up 45.

### 2.10 Commercial-page rebuilds (2026-11-16)

- Rebuilt five commercial pages to first-hand, dated reviews, each with a visible
  “verified 16 November 2026” badge, an author box, source list, real PopupLoom
  screenshots and 11–23 internal links:
  - `/alternatives/poptin.html` — 3,498 words in `<main>`; 1,000-visitor free plan,
    $240/$564/$1,140 annual tiers, email and coupon bundle, visitor-vs-pageview unit.
  - `/alternatives/popupsmart.html` — 3,500 words; 5K pageviews, one live popup,
    100 email quota, $390–$1,590 annual tiers. The page prints two different
    money-back windows (7/15 days at the top, 15 days/one month at the footer);
    both are quoted and the reader is told to confirm in writing.
  - `/alternatives/optimonk.html` — 2,875 words; 10,000 pageviews, 1,000 AI
    credits and one domain on free, $228–$2,148 annual tiers, and an explanation
    of the two meters. The pricing page carries its own “Last updated September
    2026” note.
  - `/alternatives/popup-maker.html` — 2,724 words; WordPress-only free plugin
    1.25.0, 600,000+ installs, 4.9/5 from 4,516 reviews, Pro at $99/year with a
    40% first-year discount. The page states plainly that the free plugin wins on
    WordPress and covers the plugin maintenance cost.
  - `/best-free-popup-builder.html` — 2,823 words; honest six-tool shortlist with
    named trade-offs, a dated comparison table and a “what free means” section.
- Every vendor fact was read from the vendor’s own pricing or product page on
  16 November 2026. No vendor account was created and no campaign was run, and
  each page says so.
- Ads remain off on all five pages; the 20-page allowlist is unchanged.
- Regenerated `worker/csp-hashes.json` (JSON-LD changed on five pages), refreshed
  the sitemap (47 URLs, all five rebuilt pages dated 2026-11-16) and re-ran the
  suites: 55/55 regression, 20/20 Cloudflare unit, 140/140 Cloudflare integration.
- Deployed Worker version `ca192922-4bc4-4da5-8bc4-183e2b399937`; live checks
  confirm 200, public revalidate cache, one H1, valid JSON-LD hash in CSP, no
  `unsafe-inline`/`unsafe-eval`, no ad nonce and no ad code on all five.
- Follow-up fixes before close-out: the Popup Maker page had cited a screenshot
  that turned out to be a text callout rather than the publish panel, so it was
  swapped for the real guest publish-panel screenshot and the Article `image`
  array updated to match; the best-free table gained a visible “scroll sideways”
  hint plus a labelled, focusable scroll region. Both re-tested and redeployed as
  `3c1a9131-bacb-4900-b9c0-e6d0aaa81203`.
- IndexNow accepted all 47 URLs (HTTP 200). Scorecard: 47 pages, 0 issues,
  1,344 average words, 0 thin pages, 47/47 structured data.

### 2.11 Named comparisons retired (2026-11-16)

- **Owner decision:** stop publishing pages that name competitors. The comparison
  cluster now describes offer *patterns* instead of vendors.
- Deleted `/alternatives/optinmonster.html`, `poptin.html`, `popupsmart.html`,
  `optimonk.html` and `popup-maker.html`, plus `scripts/generate-comparison-pages.cjs`
  so they cannot be regenerated by accident. Each old URL returns **301** to
  `/free-popup-builder-no-limits.html` in both the Express app and the Worker.
- Rewrote the two surviving commercial pages and the free-tier guide with no vendor
  names, prices or review scores:
  - `/free-popup-builder-no-limits.html` — 2,685 words. Defines the meter, works an
    example at 10,000 pageviews, covers at-limit behaviour, when paying is rational,
    and what “no limits” does and does not promise.
  - `/best-free-popup-builder.html` — 2,657 words. Nine checks, a 0–2 scoring sheet
    and an honest list of the four checks PopupLoom fails.
  - `/guides/free-popup-builders-without-pageview-limits.html` — 1,561 words. A
    20-minute audit with formulas and five questions to send support.
- Removed names from the homepage comparison module, the guides hub, ten template
  footers, the WordPress-without-plugin footer, `llms.txt` and the ROI calculator.
  Calculator presets were renamed to neutral ids (`impressions-2500`,
  `pageviews-10000`, and so on) with the same arithmetic and the same default state.
- Removed `alternatives` from the Express/Worker allowlists, the Cloudflare build and
  the CSP hash scan. Sitemap is now **42 URLs**.
- **Accuracy correction:** the deleted comparison copy claimed PopupLoom had no
  exit-intent or scroll trigger. It has six triggers, including desktop exit intent,
  scroll depth and scroll-past-element. The surviving pages now state the real list,
  and the limitation is narrowed to “exit intent does not fire on touch devices”.
- Tests: 55/55 regression, 20/20 Cloudflare unit, 140/140 integration. Added 301
  assertions for all five retired URLs and a guard that eight public pages contain
  none of the five competitor names. Audit reports 0 issues at 42 pages and
  42/42 structured data.
- Deployed as `0ea44078-dcd6-46ef-9d23-cf65d4aaa9b9`, then `8b0bf00e-bce8-4794-ad56-183465bf4a30`
  after fixing two title/description length warnings. IndexNow accepted all 42 URLs.
- Trade-off accepted: the “<brand> alternative” queries are no longer targeted. The
  pages that remain do not go stale when a competitor changes its pricing.

### 2.12 Programmatic tranche: two tools and six template pages (2026-11-16)

An external “engineering-as-SEO” plan was reviewed on 2026-11-16. The parts that fit
the product and the owner's rules were executed; the rest was rejected.

**Adopted**

- `/tools/exit-intent-code-generator.html` — writes a zero-dependency desktop
  exit-intent snippet from sensitivity, delay and cooldown, with a live preview and
  copy button. The snippet builds the overlay with `textContent`, checks for a fine
  pointer, and stores only a cooldown timestamp. 1,272 words.
- `/tools/popup-copy-generator.html` — deterministic 12-set matrix across industry,
  goal and tone, with badge, headline, subheadline, button and disclaimer
  placeholders. No conversion claim. 951 words.
- Six template guides, each with unique copy, a configuration table, setup steps,
  measurement notes and matching FAQ schema: cart rescue, announcement bar,
  back in stock, Black Friday, age confirmation and free shipping bar. 874–1,031
  words. This brings the template detail set to ten.
- Internal links added from the homepage tools section, the guides hub, the tools
  index block on `/templates.html`, five template category hubs, and the two older
  tools. Sitemap is now **50 URLs**.

**Rejected, with reasons**

- The 12 named competitor pages: they contradict the no-names rule in `AGENTS.md`.
- Stripping display ads from SaaS and guide pages: the 20-page allowlist is locked.
- Generating all 45 template pages from one dataset at once: variable-swapped pages
  are the doorway pattern the earlier plan warned against. Waves of six to ten with
  unique copy are the chosen method.
- A second `.mjs` build/schema pipeline: the repo already has `build-cf.cjs`,
  `csp-hashes.js` and `sitemap-lastmod.cjs`; a parallel pipeline would create two
  sources of truth.

**Plan facts corrected before use**

- `/embed.js` returns 404; the install path is `/embed/1.1.0/popuploom.js`.
- The catalogue has 10 category pages, not 9.
- The plan's guide URLs (`/guides/popup-for-shopify.html`,
  `/guides/free-website-popup-builder-comparison.html`) do not exist; the real paths
  are `/guides/shopify-popup.html` and
  `/guides/free-popup-builders-without-pageview-limits.html`.
- The plan's default conversion figures (3.2% and 2.5%) are invented benchmarks and
  were not used.

**Verification**

- 55/55 regression, 20/20 Worker unit, 140/140 integration. Browser-tested both
  tools (output updates, preview opens and closes with Escape, copy works, 12 cards,
  no horizontal overflow at 390px). Deployed
  `70bbd703-bda5-4e23-997c-557b673a2245`; IndexNow accepted all 50 URLs. Audit: 50
  pages, 0 issues, 50/50 structured data.

### 2.13 Six verified platform guides (2026-11-17)

Added framework and platform installation guides, each naming the exact placement
path rather than saying “add the code to your site”:

| Page | Words | Placement covered |
|---|---:|---|
| `/guides/nextjs-popup.html` | 819 | `app/layout.tsx` with `next/script`; `_app.tsx` or a plain tag in `_document.tsx` |
| `/guides/react-popup.html` | 730 | `index.html` or a component with a duplicate-load guard |
| `/guides/astro-popup.html` | 712 | layout with `is:inline`, view-transition caveat |
| `/guides/google-tag-manager-popup.html` | 712 | Custom HTML tag, triggers, consent, duplicate-load check |
| `/guides/static-html-popup.html` | 684 | before `</body>`, `file://` caveat, caching |
| `/guides/bigcommerce-popup.html` | 719 | Script Manager footer, Stencil alternative, checkout boundary |

Every page states what was verified and what was not: documentation checked on
17 November 2026, not tested on a live deployment. External references were fetched
and returned 200. The pages carry `Article` + `FAQPage` + `BreadcrumbList`, not
`HowTo`, because Google no longer shows HowTo rich results for most sites and a
mismatched HowTo block would fail the structured-data mirror test.

**Operational catch:** the first deploy uploaded only three assets. The Express and
Worker allowlists had the new guides, but `scripts/build-cf.cjs` keeps an explicit
copy list, so the six HTML files never reached `.cf-build/public`. They returned 200
from the Worker shell only after being added to that list. Any future page added to
an allowlist must also be added to the build list — the allowlist decides what may
be served, not what exists.

Verification: 55/55 regression, 20/20 Worker unit, 140/140 integration; all six live
with 200, public cache, one H1, valid JSON-LD hash, no ads and no unsafe CSP
directives. Deployed `11e20337-44a8-42a2-8357-c925c1f0342d`; IndexNow accepted all
**56 URLs**. Audit: 56 pages, 0 issues, 56/56 structured data, 1,088 average words.

### 2.14 ads.txt 404 incident (2026-11-17)

AdSense reported **“Earnings at risk — ads.txt issues”** and the Sites table showed
`popuploom.com` as **Not found**. The live URL was returning 404.

**Cause:** `scripts/build-cf.cjs` wrote `ads.txt` only when
`ADSENSE_PUBLISHER_ID` existed in the *build shell*. The Worker had the variable as
a runtime binding (visible in the deploy output), but the last several builds ran
without it, so the file was never copied into `.cf-build/public`. The Worker's
`PUBLIC_FILES` set still listed `ads.txt`, so the asset lookup returned 404 instead
of falling through.

**Fix:** the Worker now derives `ads.txt` from `env.ADSENSE_PUBLISHER_ID` at request
time, before any asset lookup. It is still fail-closed: no valid `pub-\d{16}` value
means 404. The build-time generation is left in place as a fallback, which keeps the
existing build tests valid.

**Verified live:** `https://popuploom.com/ads.txt`, `https://www.popuploom.com/ads.txt`
and `http://popuploom.com/ads.txt` all return 200, `text/plain; charset=utf-8`, with
the exact body `google.com, pub-8947829712444522, DIRECT, f08c47fec0942fa0`, for
browser, AdsBot and Googlebot user agents. The route answers before any host or
scheme redirect, because AdSense may check the host it verified and a redirect is
one more failure mode. Integration tests assert all three origins and the
fail-closed case.

**Lesson:** an allowlist entry decides what may be served, not what exists. Runtime
bindings are the reliable source for a value that must not depend on the deploy
shell. A file that a third-party crawler fetches should not depend on a redirect
either.

### 2.15 Tools hub and the proxy blueprint that was rejected (2026-11-17)

An external blueprint proposed a second Cloudflare Worker on `popuploom.com/tools*`
reverse-proxying a separate Pages origin, rewriting canonicals with `HTMLRewriter`.
It was rejected. `/tools/*` is already served by the `popforge` Worker, four tool
URLs are already indexed in `sitemap.xml`, and a second Worker on that route would
detach the subtree from `PUBLIC_FILES`, the CSP hash set, `hostPolicy` redirects and
404 handling. The sample code also proxied every path instead of the declared slug
list, appended a duplicate canonical on every page (the `head` handler runs before
the `link[rel=canonical]` handler), forwarded cookies to the origin and cached HTML
with `cacheEverything`. The real gap it pointed at was smaller: no page existed at
`/tools/`.

**Shipped:** `tools/index.html`, a 1,489-word hub at `https://popuploom.com/tools/`.
It carries a decision table (which tool for which question), a section per tool with
inputs, outputs and a stated limit, an explicit "what these tools will not tell you"
block, a six-question FAQ, and `BreadcrumbList` + `CollectionPage`/`ItemList` +
`FAQPage` JSON-LD. Ad-free, as every new page ships until reviewed.

**Also fixed:** the four tool pages had a breadcrumb whose "Tools" link pointed at a
tool, not a hub — on the copy generator it pointed at the page itself. Visible
breadcrumbs and structured `BreadcrumbList` now point at `/tools/`.

**Wiring:** `PUBLIC_FILES` in `worker/index.js` and `server/index.js`, the CSP page
set in `server/security.js`, a `DIRECTORY_HUBS` map in the Worker and an equivalent
redirect in `server/index.js` (`/tools/index.html` → 308 `/tools/`), `hostPolicy`
alias entries, `sitemap.xml`, `llms.txt`, `llms-full.txt`, the homepage tools
section and the guides hub. `scripts/csp-hashes.js` picks the new page up
automatically; `scripts/build-cf.cjs` already copies the whole `tools/` directory.

**Tests:** regression asserts the hub returns 200 with one canonical, four list
items, a FAQ block, and that every tool links back to `/tools/` in both the visible
and structured breadcrumb. Worker integration asserts the 308 alias, the canonical
and the JSON-LD CSP hash. 57 sitemap URLs, 56/56 regression, 20/20 worker unit,
140/140 integration.

**Lesson:** a hub is a URL, not a folder. If the directory form 404s while four
children are live, the children have no parent, and their breadcrumbs are lying.

### 2.16 robots.txt kept plain (2026-11-17)

Lighthouse flagged `robots.txt` as invalid on every audit. `Content-Signal:` and
`Agentmap:` sat above the first `User-agent` group, which a strict parser treats as
rules outside a group. Both directives are non-standard additions.

**Chosen fix:** remove both from the file and rely on the channels that already
carry them. `Content-Signal` is sent as a response header on every page by both the
Express server and the Worker, and the ARD manifest stays discoverable through the
`Link` header and its well-known path. `robots.txt` now opens with `User-agent` and
contains only standard directives; a comment says where the two signals moved so
they are not re-added.

**Verified live:** `robots.txt` is 200 `text/plain`, no `Content-Signal:` or
`Agentmap:` line, 12 `Disallow` rules intact, and the `Content-Signal` header is
still present on the response and on the homepage. A `Mediapartners-Google` request
still returns 200 with the AdSense verification meta tag, and `ads.txt` still returns
the exact record. Lighthouse now reports SEO 100 with no failures.

**Lesson:** a duplicate channel that trips validators is worse than a single channel
that does not. Keep the signal on the header, keep the file plain.

### 2.17 Six template guides for the untouched categories (2026-11-17)

The template cluster covered ten designs but skipped six categories that the
product actually ships: video, feedback, referral, checkout trust, giveaway and
shipping notices. Each new page is a setup guide rather than a gallery entry, in
the 1,170–1,340-word range, with `Article` + `FAQPage` + `BreadcrumbList` schema,
a visible author line and a "template checked" date.

**What each page refuses to claim:** the video page says playback data belongs to
the video provider and that the player loads only when the panel opens; the
feedback page says a `choice` value is stored but no sentiment scoring, branching
or follow-up exists; the referral page says codes are pasted by the owner, not
generated or validated; the trust page says a popup cannot certify PCI compliance
or verify a guarantee; the giveaway page says the draw, eligibility and winner
contact are the owner's; the shipping page says there is no start/end scheduler.

**Internal links:** every category page that owns one of these designs now carries
a "Read the full guide" card link plus a Related-guides entry, and each guide
links back to its category, two sibling guides, and the relevant install or
vertical guide. Depth stays home → `templates.html` → category → guide.

**Generator fix:** `scripts/generate-template-pages.cjs` used to rewrite category
pages from scratch, which would have deleted the author lines, the long-form
sections, the H1 overrides and the new guide links on the next run. It now carries
`TEMPLATE_GUIDES` for all 16 guide pages, keeps the manual `guides` arrays and the
`SECTIONS` copy, and renders the author line and CollectionPage author. Dry-run
output was diffed against the live files: the only differences left are
indentation and the card links added in this wave.

**Verified live:** all six URLs 200, self-canonical, one `h1`, JSON-LD parses,
hash-based CSP with no nonce and no `script-src` `unsafe-inline`/`unsafe-eval`,
`public, max-age=0, must-revalidate`, present in `sitemap.xml` (63 URLs, no
duplicates) and `llms.txt`. All three test suites pass; the no-names guard now
includes these six pages. IndexNow submitted 63 URLs and returned 200.

**Still owner-side:** Search Console URL Inspection requests for the six new
guides, `/tools/` and the six platform guides from the previous wave. Sitemap
discovery should reach 63 pages on the next read.

### 2.18 An ignore rule that broke every deploy (2026-11-17)

GitHub showed a wall of red `production` deployments. They were records from the
"Test and deploy to Cloudflare" workflow, not Cloudflare deploys, and every run
since `af32ec5` died in about 17 seconds at *Check Worker build and API
integration* with:

```
[custom build] Error: ENOENT: no such file or directory, copyfile
'guides/google-tag-manager-popup.html' -> '.cf-build/public/guides/...'
```

**Cause:** `.gitignore` carried an unanchored `google*.html` entry, meant for
Search Console verification drop files at the repo root. Git matches an
unanchored pattern at every depth, so it also swallowed
`guides/google-tag-manager-popup.html`. The page existed on disk and shipped from
the working tree, so the live site looked perfect, but a fresh clone had no such
file. `scripts/build-cf.cjs` hardcodes that path, so the build threw before any
test step could run.

**Blast radius:** the guide was live only because the deploy ran from this
machine. Any deploy from CI, from a fresh clone or from another machine would
have shipped a Worker whose allowlist advertises a page with no file behind it —
a 404 on a URL that the sitemap and five internal links point at.

**Fix:** anchor the drop-file patterns to the repo root (`/google*.html`,
`/BingSiteAuth.xml`), commit the missing guide, and add a regression test that
reads the build list plus `templates/`, `tools/` and `assets/` and fails if any
build input is gitignored. The first version of that test spawned one `git
check-ignore` per file and slowed the suite enough to cause an unrelated
ECONNRESET flake; it now pipes the whole list into one process.

**Verified:** a shallow clone of `HEAD` runs `node scripts/build-cf.cjs` with no
error and produces 166 files; CI run `44030138485` is the first green deploy
since `af32ec5` at 1m27s; live health, `ads.txt`, the ad slot, the legacy runtime
byte-equality and 63 sitemap URLs all check out after the CI deploy.

**Lesson:** an ignore pattern is a deployment input. Anchor every glob that means
"this file in this folder", and test that the build's inputs are visible to git,
because a green local build cannot see the difference.

### 2.19 The embed checksum depended on the deploy machine (2026-11-17)

Comparing every built file against the live site found one substantive
difference that was not an ad-injection artefact: `/embed/1.1.0/SHA256SUMS`.

- Live (built by Linux CI): `d4521160…`
- Built here (Windows): `cb82fc…`

Both files hashed their own local `popuploom.js`, so each was internally
consistent and the regression test passed either way. The cause was line
endings: a Windows checkout keeps CRLF, a Linux checkout keeps LF, and the hash
was computed over whichever bytes were on that machine. A customer who pinned
the published checksum could see a mismatch after an ordinary deploy — exactly
what that file is supposed to prevent.

**Fix:** `scripts/build-cf.cjs` normalises every text asset in the bundle to LF
once, after all copies and before hashing, then hashes the built
`embed/1.1.0/popuploom.js` rather than the source file. A Windows build now
produces `d4521160…`, identical to CI. CSP hashes were already line-ending
tolerant, so no script hash changed and `worker/csp-hashes.json` is untouched.

**Verified:** 70/70 HTML pages byte-identical to the live site once the
per-request ad script, ad slot, inline `push()` call and nonce attributes are
removed; 47 text assets matched after CRLF normalisation; the three remaining
"differences" were the same CRLF artefact in an extension-less `.well-known`
file, `assets/source/README.md` and the checksum file itself. All three suites
pass after the change.









---

## 3. Positioning and audience

### 3.1 One-sentence position

> **PopupLoom is the free popup builder with no pageview limits, no trial and no
> credit card — 45 templates, a two-line install, lead export and signed webhooks on
> any site that accepts custom HTML.**

### 3.2 Who it is for

1. **Solo site owners and small stores** on WordPress, Shopify, Webflow, Squarespace,
   Wix or custom HTML who hit a pageview cap on a free popup tool.
2. **Developers and technical marketers** who prefer a small script over a plugin or
   an app, and who value signed webhooks and CSV over a locked dashboard.
3. **Lead-gen sites** (agencies, newsletters, course creators, local services) that
   need email capture without a monthly platform.

Not the audience: enterprise CRO teams needing A/B testing, audience segmentation,
cart integration, SMS/email sending or multi-step journeys. Those are honest gaps and
should be stated on comparison pages rather than hidden.

### 3.3 Why the wedge is credible

| Tool | Free-tier limit | PopupLoom difference |
|---|---|---|
| OptinMonster | ~500 impressions/month via plugin | No pageview cap |
| OptiMonk | ~10,000 pageviews/month | No pageview cap |
| Popupsmart | ~5,000 pageviews/month | No pageview cap |
| Poptin | ~1,000 visitors/month, branding | No pageview cap, optional credit |
| Claspo | ~3,000 pageviews/month | No pageview cap |
| Popup Maker | Free only inside WordPress | Works on any site via script |

Claims must stay factual and dated. Re-verify competitor limits before publishing and
link to the competitor's own pricing page as the source.

---

## 4. Keyword and page strategy

No search-volume numbers are invented here. Validate demand in GSC, Google Keyword
Planner and Bing Webmaster before committing production pages. Priority reflects
intent and fit, not guessed volume.

### 4.1 Cluster map

| Cluster | Intent | Example queries | Target page | Status |
|---|---|---|---|---|
| No-limits wedge | Commercial | free popup builder no pageview limit, unlimited popup builder free | `/guides/free-popup-builders-without-pageview-limits.html` + a dedicated `/free-popup-builder-no-limits.html` | Existing guide; add money page |
| Free builder | Commercial | free popup builder, free website popup builder | `/` (refine title/H1 around free) | Existing |
| Platform | Commercial | free WordPress popup, Shopify popup without app, Webflow popup, Squarespace popup, Wix popup | 5 existing platform guides | Existing; expand + interlink |
| Trigger | Commercial/info | exit intent popup, scroll popup, timed popup, click trigger | `/guides/exit-intent-popup.html` + new trigger pages | Partial |
| Use case | Commercial | email signup popup, lead magnet popup, discount popup, announcement bar | New use-case pages | Gap |
| Templates | Transactional/long tail | exit intent popup template, spin to win popup template, Black Friday popup template | New `/templates/...` pages | Gap |
| Comparisons | Commercial | OptinMonster alternative free, Poptin alternative, Popupsmart alternative | Retired 2026-11-16; 301 to the no-limits page | Removed by owner decision |
| Head comparison | Commercial | best free popup builder, popup builder comparison | `/best-free-popup-builder.html`, now a vendor-neutral nine-check checklist | Rewritten 2026-11-16 |
| Informational | Info | how to add a popup to a website, popup not showing, popup SEO, intrusive interstitials | Guides | Partial |
| Branded | Navigational | popuploom, popuploom login, popuploom review | Home, FAQ, About | Existing |

### 4.2 Money pages and their current shape

1. `/free-popup-builder-no-limits.html` — the wedge page. Explains what a traffic
   meter is, works an example at 10,000 pageviews, covers the at-limit behaviour and
   what “no limits” does and does not promise. Deliberately names no vendor.
2. `/best-free-popup-builder.html` — a nine-check buying checklist (unit, reset,
   campaign and domain caps, feature gates, branding, install, export, paid cliff,
   support). No vendor names and no ranking.
3. `/guides/free-popup-builders-without-pageview-limits.html` — the 20-minute audit
   you can run on any free tier, with the formulas and the questions to send support.
4. `/guides/wordpress-popup-without-plugin.html` — for people who cannot or will not
   install a plugin.

**Named competitor pages were retired on 2026-11-16 at the owner's request.** The five
`/alternatives/...` pages were deleted and each URL 301s to
`/free-popup-builder-no-limits.html`. The two surviving commercial pages were rewritten
to compare offer patterns rather than vendors. This gives up the “<brand> alternative”
queries; it gains a claim that does not rot when a competitor changes its pricing, and
removes the risk of publishing a dated price that is wrong a month later.

Each page still needs: a clear table with dates, “who it is for” and “who it is not
for”, screenshots, limits, FAQ and a tested CTA. No competitor FUD, no invented review
counts, and no vendor names outside the retired-URL redirects.

### 4.3 Template pages: the biggest long-tail asset

45 templates across: discount (7), email (10), gamified (2), seasonal (3), age (2),
social (3), announce (6), engage (8), video (1), exit (3).

Do **not** publish 45 near-duplicate pages. Google treats mass variable-swapped pages
as doorway/thin content. Publish in waves of 8–10, each with:

- a real rendered preview image and a live “try this template” link;
- 600–1,000 words of unique copy: who it suits, when to show it, what to write, which
  trigger/frequency to use, what to avoid;
- 2–4 genuine examples or annotated screenshots (own designs, not copied);
- an FAQ block based on real questions;
- links to the parent category hub and 3 sibling templates.

Wave 1 (highest commercial intent): exit-intent, cart rescue, first-order discount,
48-hour drop, spin-to-win, email signup, lead magnet, back-in-stock, webinar, announcement bar.

Category hubs (10 pages) can be thinner but must still explain the category and link
to every published template in it.

### 4.4 Informational cluster to build trust

- How to add a popup to any website (existing; expand).
- Popup triggers explained (load, delay, scroll, click, exit intent).
- Popup frequency capping: what “once per day” actually means.
- Why your popup is not showing (existing; add decision tree).
- Popup accessibility: focus, Escape, reduced motion, screen readers.
- Do popups hurt SEO? Google’s intrusive-interstitial guidance, explained honestly.
- Popup conversion benchmarks: only publish with real, sourced data.
- Popup copywriting: 20 tested patterns (own examples).
- How to test a popup without annoying visitors.
- Popup privacy: what a builder should never store on the customer’s site.

The “do popups hurt SEO” page is a trust differentiator: most popup vendors avoid the
topic. State plainly that intrusive mobile interstitials can be penalized, and that
exit-intent and delayed popups are the safer pattern.

---

## 5. Technical SEO backlog

### P0 — this week

1. **Search Console access.** Sign in to the DNS-verified `sc-domain:popuploom.com`
   property. Submit `https://popuploom.com/sitemap.xml`. Inspect and request indexing
   for all 23 URLs (spread over 2–3 days).
2. **Bing Webmaster Tools.** Verify (DNS or import from GSC). Submit the sitemap.
   IndexNow is already live and was re-run on 2026-11-14 (23 URLs, HTTP 200).
3. **Rewrite short titles/descriptions** for About, Contact, Terms; trim the guides hub
   description.
4. **Add structured data** to the six pages missing it.
5. **Check the Page indexing report** for “Discovered/Crawled — currently not indexed”
   and “Duplicate without user-selected canonical”. Fix causes before adding pages.

### P1 — next 30 days

6. Add real `lastmod` values to `sitemap.xml`; automate from git commit dates per page.
7. Add a visible “Last updated” line and author/reviewer to every guide.
8. Internal-link modules: “Related guides”, “Next step”, and contextual links from
   every guide to the money pages.
9. Add all five platform guides and the template hub to the homepage/footer.
10. Add `WebSite` + `SearchAction` only if a real site search exists; otherwise keep
    the current `WebSite` node without a fake search action.
11. Compress and dimension every OG/preview image; keep CLS at 0.
12. Confirm ad slots reserve height and never push content (protect CWV).

### P2 — 60–90 days

13. Add an `Atom`/`RSS` feed for guides and link it in `<head>`.
14. Add a 404 page that helps (“Popular guides”, search, home) while staying hardened.
15. Add `hreflang` only if translations are real; do not machine-translate for SEO.
16. Split the sitemap into an index if the page count passes ~200.
17. Add automated checks: broken internal links, missing titles/descriptions, duplicate
    titles, canonical mismatches, and sitemap/HTML drift in CI.

### Guardrails

- Never add `noindex` pages to the sitemap.
- Never let `/guides/` and `/guides/index.html` both become indexable duplicates;
  keep one canonical.
- Never add new pages to the AdSense allowlist automatically. Ads stay on the current
  20-page list until each new page is reviewed for content quality and policy.
- No `FAQPage` rich-result dependency: Google restricts FAQ rich results. Keep the
  schema for semantics, not as a traffic promise.

---

## 6. Authority and off-page plan

### 6.1 Owned properties (highest ROI, lowest risk)

| Asset | Action | Status |
|---|---|---|
| WordPress.org plugin | “PopupLoom – Free Popup Builder Embeds” 1.0.1 | Awaiting review — do not resubmit |
| GitHub `popuploom-embed` | MIT wrapper repo, README links to site | Published |
| GitHub main repo | README with install + docs links | Exists |
| npm package (optional) | Publish the embed wrapper if it is genuinely useful | Not started |
| Product Hunt | Launch after 20+ template pages exist | Owner action |
| AlternativeTo, SaaSHub, Slant, Peerlist | Claim/list with accurate copy | Owner account |
| G2 / Capterra | Only if eligible; do not invent reviews | Owner account |
| Indie Hackers / Show HN / relevant subreddits | Share the “no pageview limits” story, not spam | Owner voice |

### 6.2 Link-earning assets

1. **Free popup ROI calculator** (`/tools/popup-roi-calculator.html`) — client-side,
   no signup, embeddable. Targets “popup ROI calculator” and earns links from marketing
   blogs.
2. **Popup copy swipe file** (`/tools/popup-copy-swipe-file.html`) — 50 original
   headline/CTA patterns, filterable, no email gate. High link potential.
3. **Exit-intent snippet generator** — produces a copy-paste vanilla-JS snippet.
   Developer-friendly and naturally linked from Stack Overflow/Dev.to answers.
4. **Original data study** — survey 100–300 site owners about popup conversion and
   pageview-cap frustration. Publish methodology, sample size and limitations. This is
   the only ethical way to earn “popup benchmarks” links. Do not fabricate numbers.
5. **Annual “state of popup limits” report** — re-verify every competitor’s free-tier
   cap with dates and source links. Naturally cited when limits change.

### 6.3 Link targets to pursue manually

- “Best free popup builder” listicles (pitch a factual update, not a paid placement).
- WordPress/Shopify/Webflow/Squarespace tutorial sites.
- Marketing tool comparison sites (Capterra, G2, GetApp, Software Advice).
- “Awesome” lists for Webflow, Shopify, indie marketing and no-code.
- Newsletter and community roundups (Indie Hackers, Marketing Examples, etc.).
- HARO/Featured/Qwoted expert commentary on popups, CRO and intrusive interstitials.

Measure referring domains and non-brand clicks, not “mentions”.

The owner-only execution checklist (Bing Webmaster, directories, Product Hunt,
outreach template, UTM convention) is in `docs/SEO_OUTREACH.md`.

---

## 7. Measurement

### 7.1 Tools

- **Google Search Console** — queries, pages, indexing, CWV, manual actions.
- **Bing Webmaster Tools** — Bing index and keyword data.
- **Cloudflare Web Analytics** — traffic and referrers; GA4 is not used and should not
  be added.
- **D1 product metrics** — accounts created, widgets saved, widgets with a first view,
  widgets with a first lead. These are the real north-star numbers.
- **UTM links** for every outbound campaign; keep them consistent.

### 7.2 Weekly scorecard

| Metric | Source | Why |
|---|---|---|
| Indexed pages | GSC Pages | Is the site participating at all? |
| Impressions / clicks / CTR | GSC Performance | Demand and title/meta fit |
| Average position for target queries | GSC | Are money pages moving? |
| Non-brand clicks | GSC filter | Real acquisition, not brand recall |
| Referring domains | GSC Links / Bing | Authority trend |
| Signups | D1 | Traffic quality |
| Widgets saved | D1 | Activation |
| Widgets with first view | D1 | Installation |
| Widgets with first lead | D1 | Value delivered |
| CWV “Good” URLs | GSC | Technical health |

### 7.3 Targets (not promises)

- **30 days:** all 23 URLs inspected; sitemap success; 0 P0 audit issues; 10+ pages
  indexed; 5 money/template pages shipped.
- **90 days:** 45–60 indexable pages; 10–20 long-tail queries in the top 20; 5–10
  referring domains; first non-brand signups attributable to search.
- **6 months:** 100+ quality pages; 50+ referring domains; consistent non-brand clicks;
  comparison pages ranking for competitor-alternative terms.
- **12–24 months:** competitive for “free popup builder” variants; head term
  “popup builder” only if authority and links justify it.

---

## 8. 90-day execution plan

### Week 0 (now)

- [x] Owner signed in to Search Console; baseline recorded (13 indexed / 48 not,
  4 clicks / 35 impressions, 0 external links, no manual actions).
- [x] Sitemap submitted and read successfully: 23 discovered pages.
- [x] Requested indexing for the 4 discovered-but-not-crawled URLs.
- [ ] Verify Bing Webmaster; re-run IndexNow after each deploy.
- [x] Fixed the 11 audit issues (titles, descriptions, schema, About copy).
- [~] Added real `lastmod` for the new template pages; older URLs still need dates.
- [x] Added 10 public template category pages and repointed all 45 gallery cards
  away from `/studio.html?tpl=...`.

### Weeks 1–2

- [x] Publish the no-limits money page.
- [x] Publish 3 alternative pages (OptinMonster, Poptin, Popupsmart).
- [x] Add homepage/footer links to all platform and money pages.
- [ ] Set up the weekly scorecard.

### Weeks 3–4

- [x] Publish 2 more alternatives (OptiMonk, Popup Maker) and “best free popup builder”.
- [x] Publish WordPress-without-plugin page.
- [ ] Expand the 5 platform guides with fresh screenshots and FAQs.
- [~] Publish template hub + first 4 individual template pages; next wave is 4 more.

### Weeks 5–6

- [ ] Publish next 8 template pages.
- [ ] Publish 4 informational guides (triggers, frequency, accessibility, testing).
- [ ] Ship the ROI calculator.
- [ ] Internal-link audit and fixes.

### Weeks 7–8

- [ ] Publish 4 comparison pages (OptiMonk, Claspo, Wisepops, Popup Maker).
- [ ] Publish “do popups hurt SEO?” and “popup privacy” guides.
- [ ] Start the owner survey for the original data study.
- [ ] Pitch 20 listicles and directories with factual updates.

### Weeks 9–10

- [ ] Publish the copy swipe file and exit-intent snippet generator.
- [ ] Publish 4 more template pages.
- [ ] Refresh underperforming titles/descriptions using GSC CTR data.
- [ ] Build 10–20 quality backlinks from directories and communities.

### Weeks 11–12

- [ ] Publish the data study with methodology and limitations.
- [ ] Product Hunt prep (only if the page inventory and onboarding are ready).
- [ ] Quarterly content audit: prune, merge or improve thin pages.
- [ ] Re-run the full audit and update this plan with real GSC numbers.

---

## 9. Search Console checklist (once signed in)

Do this in order and save screenshots/CSV exports as the baseline.

1. **Property:** confirmed `sc-domain:popuploom.com` (DNS TXT is present).
2. **Sitemaps:** `https://popuploom.com/sitemap.xml` is submitted, last read
   2026-11-13, status **Success**, 23 discovered URLs.
3. **Page indexing:** 13 indexed / 48 not indexed. Breakdown recorded:
   39 `noindex` (`studio.html?tpl=...`), 3 robots-blocked, 2 redirects, 4 discovered.
4. **URL Inspection:** the four discovered URLs were inspected and requested for
   indexing on 2026-11-14.
5. **Performance:** export last 3 months (or since launch). Split branded vs
   non-branded. Flag queries at positions 8–20 and pages with impressions but CTR
   below 2%.
6. **Core Web Vitals:** mobile report. Fix any URL that is not “Good”.
7. **Manual actions / Security issues:** confirm both are empty.
8. **Links:** export top linking sites and top linked pages. Compare with the plan.
9. **Crawl stats:** check response codes, file types and host status.
10. **Robots.txt:** fetch and confirm the sitemap line and private disallows.

If the property has no data, that is itself the finding: the site has not been
discovered, and indexing requests + links are the priority.

---

## 10. Risks and non-negotiables

- **AdSense:** no changes to eligibility, CSP, nonce handling or injection. New pages
  are not added to the allowlist automatically. Ads never go on private/app/legal/
  contact/terms/demo pages.
- **Thin content:** no 45-page template farm. Publish only pages with unique previews,
  copy and examples. Quality gates beat volume.
- **Claims:** no fabricated certifications, review counts, customer logos, conversion
  lifts or “#1” claims. Competitor limits must be dated and source-linked.
- **Privacy:** no new tracking beyond Cloudflare Analytics; no GA4; no PII in URLs or
  client storage.
- **Security:** keep CSP hashes updated when adding inline JSON-LD; run
  `npm test`, `npm run test:cf`, `npm run test:cf:integration`, `npm audit` and
  `npm run security:scan` after any HTML/JS change.
- **Owner-only actions:** Search Console/Bing sign-in, directory accounts, Product
  Hunt, Cloudflare MFA, WordPress.org review follow-up. I can prepare everything and
  verify the result, but I cannot create accounts or accept terms on the owner’s behalf.

---

## 11. What I can do next

1. Fix the 11 on-page audit issues and add the wedge to the homepage title,
   description and H1.
2. Add `lastmod` and internal-link modules.
3. Add public template/category pages and repoint the gallery cards.
4. Draft the no-limits money page and three alternative pages.
5. Draft the template hub and first 8 template pages.
6. Build the ROI calculator and copy swipe file.
7. Add automated SEO checks to CI.
8. Re-run the audit and IndexNow after each deploy, and monitor GSC weekly.

The Search Console baseline is now recorded. The remaining owner-only pieces are the
Bing Webmaster account, directory/Product Hunt accounts, and any off-site outreach that
requires a human identity.
