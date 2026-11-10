# Search Console query review — 2026-11-10

Property: `sc-domain:popuploom.com`
Data range: 7 days (Nov 1–8, 2026), last updated 4 hours before capture.
Captured with the logged-in Search Console UI; raw copy in `private-data/gsc-performance.json`.

## Totals

| Metric | Value |
|---|---|
| Clicks | 1 |
| Impressions | 22 |
| Average CTR | 4.5% |
| Average position | 27.4 |

This is all-time data for a site that launched on Nov 1. It is **too small to set strategy**; use it for early signals only. Recheck at 28 days.

## Queries

| Query | Clicks | Impressions | CTR | Position | Read |
|---|---:|---:|---:|---:|---|
| 1 golden lane sec filing | 0 | 1 | 0% | 3.0 | Irrelevant noise; do not target |
| `-site:facebook.com ... ("select trial" or "step trial" ...)` | 0 | 1 | 0% | 21.0 | Scraped/odd query; ignore |
| pop up store builder | 0 | 1 | 0% | 34.0 | Relevant — ecommerce/Shopify |
| welcome popup | 0 | 1 | 0% | 62.0 | Relevant — email signup / welcome template |
| pop up sign up form | 0 | 1 | 0% | 81.0 | Relevant — email signup page |
| pop up wordpress | 0 | 1 | 0% | 88.0 | Relevant — WordPress guide |
| popup in wordpress | 0 | 1 | 0% | 99.0 | Relevant — WordPress guide |

## What this means

1. **WordPress is the clearest early signal.** Two queries on page 9–10 for an existing guide (`/guides/wordpress-popup.html`). Improve that page before adding new ones.
2. **"Pop up sign up form" and "welcome popup"** support the planned email-signup page.
3. **"Pop up store builder"** supports the ecommerce/Shopify pages; add the phrase naturally.
4. The two irrelevant queries are noise. Do not build content for them.
5. One click is not enough to judge titles or CTR. Fix relevance and indexing first.

## Indexing and sitemap

| Item | Status |
|---|---|
| Sitemap | Success, 19 discovered, last read Nov 9 |
| Indexed | 12 |
| Not indexed | 45 |
| Excluded by noindex | 39 — expected private/app pages |
| Blocked by robots.txt | 3 — expected `/api/` etc. |
| Page with redirect | 2 — expected |
| Crawled – currently not indexed | 1 — identify which URL; likely thin/duplicate |

Do **not** remove the noindex blocks to increase the indexed count. The 39 are studio, profile, leads, reset, verify, migration and similar private pages.

## Priority actions

1. **WordPress guide (highest):**
   - Title: include “Popup in WordPress” and “Pop Up WordPress”.
   - H1: “Add a popup to WordPress (no plugin required)”.
   - Add sections: “Popup in WordPress without a plugin”, “Pop up WordPress form”, “Why a plugin is not required”.
   - Link from FAQ, install guide and templates.
   - Request indexing after deploy.
2. **Email signup page:** target “pop up sign up form” and “welcome popup”. One page, two sections.
3. **Ecommerce/Shopify:** add “store popup builder” phrasing to the ecommerce guide and Shopify guide.
4. **Identify the one “Crawled – currently not indexed” URL** in the Pages report and either improve or consolidate it.
5. Recheck queries after **28 days**; do not churn titles before then.

## IndexNow

`npm run indexnow` submitted all 19 sitemap URLs on 2026-11-10. Response: **200 OK**. IndexNow helps Bing and partners discover changes; it does not guarantee indexing.
