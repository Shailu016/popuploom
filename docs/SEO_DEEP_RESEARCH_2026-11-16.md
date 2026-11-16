# PopupLoom SEO deep research: why we are not #1 and how to get there

**Research date:** 16 November 2026
**Scope:** organic search for `https://popuploom.com`
**Status:** research complete; two foundation fixes deployed and verified
**Non-claims:** this report does not claim a ranking, traffic number, review score, certification or security audit. It does not promise #1 in 90 days. Every competitor claim is dated and source-linked where it is used.

---

## 0. The short answer

PopupLoom is not #1 for popup-builder searches because search engines have almost no evidence that it should be.

At the last Search Console capture:

- **13 pages indexed, 48 not indexed.**
- **4 clicks and 35 impressions** in the 1–11 November window.
- **Average position 24.4** on a very small sample.
- **0 external links** reported.
- The domain was registered on **1 November 2026** and has no prior history.

At the same time, the pages competing for the same commercial queries are:

- **2,300–5,400 words** of main content, versus **736–1,364 words** on PopupLoom's key pages.
- Supported by **21–119 images**, named authors, 5–44 external citations and 1–6 structured-data blocks.
- Backed by years of publishing, brand searches, listicle inclusions and real reviews.

The product may be better. The search evidence is not there yet.

The order of work is therefore:

1. **Get indexed.** A page that is not in the index cannot rank.
2. **Earn authority.** A 15-day-old domain with zero links cannot outrank established brands for a commercial head term.
3. **Match SERP depth.** The page must answer the query with more evidence, not more adjectives.
4. **Prove the differentiator.** "No pageview limits" is a strong wedge, but it must be demonstrated, dated and independently visible.
5. **Distribute it.** Listicles, directories, reviews and communities create the brand and link signals that make the next page easier to rank.
6. **Measure and refresh.** Without query/page data, the site cannot tell which pages are close to page 1.

That is the scalable system. Buying links, publishing 45 near-duplicate template pages, or adding more on-page polish will not substitute for it.

---

## 1. What the evidence says

### 1.1 Google: barely participating

Search Console baseline, property `sc-domain:popuploom.com`, captured 10 November 2026:

| Metric | Value | What it means |
|---|---:|---|
| Indexed pages | 13 | Google has admitted only a small part of the site. |
| Not indexed | 48 | Most of the site is unknown or deliberately excluded. |
| Clicks | 4 | Too small to set strategy. |
| Impressions | 35 | The site is not competing for meaningful demand yet. |
| CTR | 11.4% | Calculated on 35 impressions; not reliable. |
| Average position | 24.4 | Page 3 on a handful of queries, not "almost page 1". |
| External links | 0 | Authority is effectively zero. |
| Internal links | 63 | Mostly sitewide navigation, not contextual depth. |
| Manual actions | None | No penalty. The problem is absence, not punishment. |
| Security issues | None | No technical trust problem. |

The earlier 7-day sample was **1 click, 22 impressions, average position 27.4**. The difference between 27.4 and 24.4 is noise, not progress.

The sitemap now contains **45 URLs**. GSC last reported **23 discovered** because the sitemap was read before the latest pages were added. That gap is itself a signal: the site is publishing faster than search engines are crawling it.

**Interpretation:** the average position is not the headline. The headline is that the site has only 35 impressions. It is not losing a close race; it is barely in the race.

### 1.2 Bing and DuckDuckGo: almost invisible

On 15 November 2026, a `site:popuploom.com` query on DuckDuckGo's Bing-backed index surfaced only:

- `https://popuploom.com/privacy.html`

A brand query for "popuploom" did not surface the product. Bing Webmaster reports:

- The sitemap is successful with **45 URLs discovered**.
- URL Submission accepted all 45 URLs.
- IndexNow lists the URLs with source "Self".
- The only Site Scan error bucket is "Blocked by robots.txt", which is expected for private app surfaces.

Bingbot receives **200 OK** from the homepage, the money page, the guides hub and the sitemap. `robots.txt` allows it. There is no crawl block.

**Interpretation:** Bing is not refusing to crawl. It is refusing to rank. That is a demand/authority problem, not a robots problem. The privacy page is likely the only URL with an external discovery path; the rest depend on a sitemap from a domain with no links.

### 1.3 The SERPs are owned by brands and listicles

SERP checks on 15–16 November 2026:

| Query | Who occupies the results | What that tells us |
|---|---|---|
| `free popup builder` | Popupsmart, WordPress.org, Common Ninja, Jotform, Claspo, involve.me, GetSiteControl, GetResponse, Elfsight | Established product pages and high-authority plugin directories. |
| `free popup builder no pageview limit` | Lilach Bullock's "Free Popup Builders (2026): 8 Options and Their Limits" and similar listicles | The exact wedge is already covered by a 2,869-word, freshly updated listicle. |
| `optinmonster alternative` | WP Astra, AlternativeTo, WiserReview, Wisepops, WorldMetrics, WiserNotify, Triggerbee, Plerdy, Outmano, OptiMonk | Comparison intent is dominated by review sites, competitor blogs and directories. |
| `wordpress popup without plugin` | Popupsmart, Claspo, GigaPress, Poper, Picreel, Themeisle, CodeCanel, NexterWP, WPProper | Tutorial intent is dominated by step-by-step guides with screenshots and code. |

PopupLoom does not appear in these results. The reason is not that its title tag is four characters too long. The reason is that the pages have not earned the right to be considered.

### 1.4 Domain age and history

- Registered **1 November 2026** (Verisign RDAP).
- First Wayback capture **1 November 2026**.
- No prior domain history, no inherited links, no brand mentions.

A new domain is not penalised for being new. It simply has no accumulated trust. Google can rank new pages for low-competition long-tail queries, but commercial head terms require signals that take time to build: links, brand searches, engagement, reviews and consistent publishing.

### 1.5 Technical findings

Verified on the live site on 16 November 2026:

| Check | Before | After |
|---|---|---|
| Public HTML cache | `Cache-Control: no-store` on every page | `public, max-age=0, must-revalidate` on ad-free public pages |
| Ad-page cache | `no-store` | `private, max-age=0, must-revalidate` because the CSP nonce changes per request |
| Private/app pages | `no-store` | `no-store` (unchanged) |
| Guides canonical | `/guides/` and `/guides/index.html` both served; canonical pointed to `index.html` | `/guides/` is canonical; `/guides/index.html` returns 308 to `/guides/` |
| Sitemap | 45 URLs, all 200 | 45 URLs, all 200, all canonical and indexable |
| Bingbot access | Allowed | Allowed; 200 on key pages |
| Googlebot access | Allowed | Allowed; 200 on key pages |
| Public `X-Robots-Tag` | Absent | Absent (correct); private pages keep `noindex, nofollow` |
| CSP / ad injection | Nonce + `strict-dynamic` | Unchanged |

`no-store` does not block indexing by itself, but it tells every cache not to retain the page. For a new site, that is the wrong signal. The fix keeps private pages uncacheable and keeps ad pages private so a shared cache cannot replay a nonce.

The `/guides/` duplicate was real: every navigation link used `/guides/`, while the canonical and sitemap pointed at `/guides/index.html`. That splits internal link equity and wastes crawl attention. It is now one URL.

### 1.6 Measurement gap

The scorecard currently records site health only:

- 45 sitemap pages.
- 0 audit issues.
- 873 average words per page.
- 45/45 pages with structured data.
- GSC clicks/impressions: **n/a**.

The `seo/` directory with `gsc-pages.csv` and `gsc-queries.csv` does not exist. Without those exports, the site cannot answer:

- Which pages are at positions 8–20 and could be pushed to page 1?
- Which queries have impressions but low CTR?
- Which pages are indexed but never shown?
- Which cluster is improving month over month?

That is not an analytics nicety. It is the feedback loop that makes the rest of the plan scalable.

---

## 2. Competitor benchmark

### 2.1 Method

I fetched the live pages on 16 November 2026 and extracted:

- visible text from `<main>` when present, otherwise `<article>` or the body;
- the number of `<img>` elements;
- the number of unique external domains linked;
- the number of JSON-LD blocks and schema types;
- author metadata;
- `datePublished` / `dateModified` when present.

Limitations:

- Word counts include navigation or boilerplate when a page has no clean `<main>`.
- JavaScript-rendered content may be undercounted.
- Word count is not quality. It is a proxy for how much evidence a page can offer.
- External-domain counts include citations, not necessarily editorial links.

### 2.2 The gap in one table

| Page | Main words | Images | External domains | JSON-LD blocks | Named author | Last modified |
|---|---:|---:|---:|---:|---|---|
| **PopupLoom homepage** | 1,241 | 0 | 0 | 1 | No | None |
| **PopupLoom no-limits page** | 1,281 | 0 | 3 | 1 | No | 2026-11-14 |
| **PopupLoom OptinMonster alternative** | 744 | 0 | 1 | 1 | No | 2026-11-14 |
| **PopupLoom WordPress guide** | 1,373 | 0 | 2 | 1 | No | 2026-11-12 |
| Popupsmart homepage | 5,384 | 119 | 17 | 3 | No | None |
| Common Ninja popup builder | 3,071* | 51 | 20 | 3 | No | None |
| Lilach Bullock free popup builders | 2,325 | 21 | 9 | 2 | Lilach Bullock | 2026-11-15 |
| WP Astra OptinMonster alternatives | 5,339 | 51 | 23 | 1 | No | 2026-08-17 |
| Wisepops OptinMonster alternatives | 2,908 | 64 | 11 | 1 | Oleksii Kovalenko | 2026-07-09 |
| Themeisle WordPress popup without plugin | 2,657 | 50 | 16 | 1 | Themeisle Editorial | 2026-09-03 |
| OptiMonk OptinMonster alternatives | 2,310 | 23 | 5 | 6 | Nikolett Lorincz | 2026-11-03 |
| WordPress.org Popup Builder | 5,179 | 28 | 44 | 1 | No | 2026-10-19 |

\* Common Ninja's main-content extraction returned only 40 words because the page is built from component sections; the body text was 3,071 words. The row is included to show the page's overall depth, not a clean article count.

### 2.3 What the gap actually is

It is not just "they have more words". The ranking pages have:

1. **Visual proof.** 21–119 images: screenshots of the editor, the popup in context, the settings panel, the published result. PopupLoom's key pages have **zero `<img>` elements**. A visitor cannot see the product before signing up, and Google has no image evidence of the experience.
2. **External citations.** 5–44 external domains per page: vendor pricing pages, documentation, platform docs, studies. PopupLoom cites 0–3. The "no limits" claim is only as credible as the dated sources behind it.
3. **Named authorship.** Most competitors show an author or editorial team. PopupLoom shows none. For commercial advice, that is an E-E-A-T gap.
4. **Update history.** The competitors have pages first published in 2021–2026 and updated through August–November 2026. PopupLoom's pages are dated 12–14 November 2026 and have no update history. Freshness is not a magic ranking factor, but it is a trust signal and a reason for search engines to recrawl.
5. **Depth of answer.** A 744-word alternative page cannot cover pricing, limits, migration, who it is for, who it is not for, setup, pros/cons, FAQs and screenshots. A 2,500–3,500-word page can.
6. **Distribution.** Lilach Bullock's listicle was published on 9 November and updated on 15 November. It is exactly the kind of page that should include PopupLoom, but it does not. That is a distribution gap, not a content gap.

### 2.4 What this means for the head term

The head term `popup builder` is not a fair fight yet:

- The page needs to be at least as useful as a 5,000-word category page.
- The domain needs enough links and brand demand that Google can justify it over Popupsmart, OptinMonster, Wisepops and the WordPress.org plugin directory.
- The site needs reviews, case studies, integrations and a track record.

That is a 12–24 month goal, not a 90-day one. The winnable fights are the no-limits wedge, platform-specific queries, template long-tail and comparison queries where the incumbent page is weaker or stale.

---

## 3. Why PopupLoom is not #1: six root causes

### Cause 1: Indexation is the first wall

Only 13 pages are indexed. The sitemap has 45. The site cannot rank with pages Google has not crawled. The causes are ordinary for a new domain: no external discovery paths, a sitemap that is newer than the last read, and very little crawl demand.

**Fix:** make every public page crawlable and internally linked, keep the sitemap accurate, submit changed URLs, and earn the first external links. This is now technically unblocked, but it still needs links and time.

### Cause 2: Authority is the second wall

GSC reports **0 external links**. A new domain with no links has no way to outrank established brands for a commercial term. This is the binding constraint after indexation.

**Fix:** earn 10–20 quality referring domains in the first 120 days, then 50+ over 6–12 months. The fastest ethical paths are listicle inclusions, directories, the WordPress.org plugin, GitHub, Product Hunt and a genuinely useful data study. Not paid links.

### Cause 3: The pages are too thin and too generic to win their queries

The money page is ~1,281 words. The alternative page is ~744. The WordPress guide is ~1,373. The pages that rank are 2,300–5,400 words with screenshots, citations, FAQs and author bylines.

**Fix:** rebuild the eight commercial pages to 2,500–3,500 words with original screenshots, a dated comparison table, a test methodology, migration steps, "who it is for / not for", FAQs and 8–12 contextual internal links. Depth without evidence is padding; depth with evidence is competitive.

### Cause 4: There is no brand demand or distribution

Bing's brand query did not surface PopupLoom. There are no listicle inclusions, no directory listings, no Product Hunt launch, no reviews and no community footprint. Search engines use brand signals and links as proxies for trust. The product is invisible off-site.

**Fix:** distribution is a first-class SEO channel. Directories, listicles, Product Hunt, GitHub, WordPress.org, Indie Hackers and real user reviews all create the brand and link signals that make the next page easier to rank.

### Cause 5: The differentiator is not proven

"No pageview limits" is the right wedge. But the page asserts it more than it demonstrates it:

- No screenshots of the competitor limits.
- No dated test log.
- No public "limits" page with a methodology.
- No independent confirmation.
- No comparison of what "unlimited" actually means for bandwidth, leads, widgets or storage.

A skeptical buyer and a search quality rater both need evidence. The claim must be visible, specific and dated.

**Fix:** publish a "PopupLoom limits" page and a "we tested 12 free popup builders" study with methodology, dates, screenshots and source links. Put the strongest three findings on the money page. Update it when vendors change their limits.

### Cause 6: The measurement loop is incomplete

Without GSC page/query exports, the site cannot see which pages are close to page 1 or which titles are losing CTR. The scorecard has no traffic data. The team is flying blind.

**Fix:** export GSC Pages and Queries to `seo/`, run the scorecard, and review the top 20 target queries weekly. Add decision rules so underperformers are rewritten or merged instead of accumulating.

---

## 4. What "#1" actually requires, by cluster

No search-volume numbers are invented here. Validate demand in GSC, Google Keyword Planner and Bing Webmaster before committing a cluster.

| Cluster | Example query | What page 1 requires | Realistic first milestone | Time to #1 |
|---|---|---|---|---|
| No-limits wedge | `free popup builder no pageview limit` | 2,500–3,500 words; dated vendor limits; screenshots; test log; 15–25 quality links; strong internal links | Top 20 in 60–90 days; top 10 in 4–6 months | 4–8 months |
| Free builder | `free popup builder` | 3,000+ words; product screenshots; templates; reviews; 30+ links; brand demand | Page 2 in 3–6 months; page 1 in 6–12 months | 9–18 months |
| Comparison | `optinmonster alternative` | 2,500–3,500 words; hands-on screenshots; pricing/limits table; migration; who it is for; 20–30 links | Top 20 in 90 days; top 10 in 6–9 months | 6–12 months |
| Platform | `wordpress popup without plugin` | 2,500+ words; code; screenshots; video; troubleshooting; 15–25 links | Top 20 in 60–90 days; top 10 in 4–8 months | 5–10 months |
| Trigger | `exit intent popup` | 2,000+ words; examples; trigger settings; mobile caveat; 10–20 links | Top 20 in 60 days; top 10 in 3–6 months | 4–8 months |
| Template long-tail | `spin to win popup template` | 800–1,200 unique words; real preview; use cases; copy examples; trigger/frequency; 5–10 links | Top 10 in 2–4 months | 3–6 months |
| Head term | `popup builder` | 100+ quality pages; 50+ referring domains; reviews; brand demand; continuous freshness | Page 2 in 9–15 months | 18–36 months |

**The honest conclusion:** #1 for the no-limits wedge is achievable first, probably in 4–8 months with consistent execution. #1 for `popup builder` is a multi-year project. Anyone who promises it in 90 days is guessing or lying.

---

## 5. The scalable strategy: five compounding loops

The plan is not a list of 100 tasks. It is five loops that feed each other.

```text
Indexation -> Content depth -> Authority -> Brand demand -> More indexation
     ^                                                           |
     +------------------- measurement and refresh ---------------+
```

### Loop 1: Indexation

**Goal:** every public page is crawled, indexed and internally linked.

Actions:

- Keep the sitemap at 45 URLs, all 200, all canonical, all indexable.
- Keep `/guides/index.html` redirected to `/guides/`.
- Submit changed URLs with IndexNow after every deploy.
- Use GSC URL Inspection for the top 10 pages; spread requests over days because of the daily quota.
- Add contextual internal links from the highest-authority pages to the money pages.
- Add `lastmod` to every sitemap entry, generated from real content changes.
- Check Bing Webmaster's Index Explorer weekly.

Metric: indexed pages, not submitted pages.

Gate: **30+ Google-indexed and 20+ Bing-indexed within 30 days.** If not, stop publishing and fix discovery first.

### Loop 2: Content depth and evidence

**Goal:** every commercial page is the most useful answer to its query, not the longest.

Actions:

- Rebuild the eight commercial pages first (money page, five alternatives, best-free, WordPress-without-plugin).
- Add real screenshots of the editor, install flow, published popup, settings, lead inbox and export.
- Add a dated comparison table with source links to vendor pricing pages.
- Add a "who it is for / who it is not for" section.
- Add a migration section from the competitor.
- Add 5–8 FAQs based on real queries, not keyword variants.
- Add a named author/reviewer and a visible "last updated" date.
- Add 2+ schema blocks where they describe visible content (Article, BreadcrumbList, FAQPage, SoftwareApplication). Do not add fake ratings.

Metric: average main-content words, images per page, external citations, schema types, author coverage.

Gate: **every rebuilt page has 2,500+ words, 8+ images, 5+ external citations, an author and a date.** A page that cannot meet this is not ready to compete.

### Loop 3: Authority and distribution

**Goal:** earn links and brand mentions that make the next page easier to rank.

Actions:

- Publish 3–5 linkable assets: the no-limits test, the ROI calculator, the copy swipe file, the competitor-limit tracker, the data study.
- Pitch 20–30 listicles and directories per month with a factual correction or addition.
- Launch on Product Hunt only after 20+ template pages and a clean onboarding flow exist.
- List on AlternativeTo, SaaSHub, Slant, Peerlist, Uneed and Microlaunch with accurate copy.
- Keep the WordPress.org plugin, GitHub repos and npm package active.
- Answer real questions on Indie Hackers, relevant subreddits and Stack Overflow; disclose affiliation.
- Offer expert commentary on popups, CRO and intrusive interstitials to newsletters and podcasts.

Metric: referring domains, listicle inclusions, brand-search impressions, non-brand clicks.

Gate: **10–20 quality referring domains within 120 days; 50+ within 12 months.** If outreach produces links but no rankings, the content is the problem. If content is strong but links do not come, the offer is the problem.

### Loop 4: Product proof and trust

**Goal:** give a skeptical buyer and a search quality rater a reason to believe the product is real and safe.

Actions:

- Publish a public changelog and a status page.
- Publish a plain-language security page: what is stored, where, for how long, how export/delete works.
- Publish a founder/about page with a real person and a real story.
- Show the product in the first screen: a live demo or an annotated screenshot, not a signup wall.
- Keep the no-credit-card, no-trial, no-pageview-limit promise specific and visible.
- Ask real users for reviews only when they volunteer; never incentivise or fabricate.
- Publish case studies only when a real user agrees; until then, publish your own dogfood data with a clear label.

Metric: branded searches, direct traffic, demo-to-signup rate, review count (real), support response time.

Gate: **brand queries start appearing in GSC within 6 months.** If people search for the brand and cannot find it, distribution is still too weak.

### Loop 5: Measurement and refresh

**Goal:** know which pages are close, which are dead and what to do next.

Actions:

- Export GSC Pages and Queries to `seo/gsc-pages.csv` and `seo/gsc-queries.csv`.
- Run `npm run seo:scorecard` weekly.
- Track 20 target queries in a simple sheet: position, impressions, clicks, CTR, URL.
- Review pages at positions 8–20 first; they are the cheapest wins.
- Refresh the top 20 pages monthly; refresh the rest quarterly.
- Merge or rewrite pages with no impressions after 8 weeks.

Metric: impressions, clicks, average position, CTR, indexed pages, referring domains.

Gate: **month-over-month impressions growth for 3 consecutive months.** If impressions are flat, the site is not earning demand; fix distribution or intent, not font sizes.

---

## 6. Phased execution plan

### Phase 0 — Days 0–14: make the site crawlable and measurable

| Action | Owner | Status |
|---|---|---|
| Replace `no-store` on public HTML with revalidate | Engineering | Done and verified 16 Nov 2026 |
| Keep private/app pages `no-store` | Engineering | Done and verified |
| Canonicalize `/guides/`; 308 `/guides/index.html` | Engineering | Done and verified |
| Keep 45 sitemap URLs 200, canonical and indexable | Engineering | Verified |
| Re-run IndexNow after deploy | Engineering | Done: 45 URLs, 200 OK |
| Export GSC Pages and Queries to `seo/` | Owner | Pending |
| Recheck Bing index and request the top 10 URLs | Owner | Pending |
| Add contextual internal links to the top 10 commercial pages | Engineering | Pending |
| Add real `lastmod` to every sitemap entry | Engineering | Pending |
| Check GSC Core Web Vitals report | Owner | Pending |

**Gate:** 30+ Google-indexed, 20+ Bing-indexed, 45/45 sitemap URLs 200, 0 audit issues.

### Phase 1 — Days 15–60: rebuild the money pages

| Page | Target words | Required evidence | Internal links in |
|---|---:|---|---:|
| `/free-popup-builder-no-limits.html` | 3,000 | Dated vendor limits, screenshots, test log, comparison table, FAQ, author | 10+ |
| `/alternatives/optinmonster.html` | 2,500 | Hands-on screenshots, pricing, limits, migration, who it is for | 8+ |
| `/alternatives/poptin.html` | 2,500 | Same | 8+ |
| `/alternatives/popupsmart.html` | 2,500 | Same | 8+ |
| `/alternatives/optimonk.html` | 2,500 | Same | 8+ |
| `/alternatives/popup-maker.html` | 2,500 | WordPress-only vs any-site angle | 8+ |
| `/best-free-popup-builder.html` | 3,500 | Honest shortlist including competitors, methodology, limits table | 10+ |
| `/guides/wordpress-popup-without-plugin.html` | 2,500 | Code, screenshots, video, troubleshooting | 8+ |

Also in this phase:

- Publish 10 individual template pages with real previews and unique copy.
- Publish 4 informational guides: triggers, frequency capping, accessibility, "do popups hurt SEO?".
- Ship the ROI calculator and the copy swipe file.
- Add a visible author/reviewer box and "last updated" line to every guide.
- Add a "Related guides / next step" module to every page.

**Gate:** every rebuilt page meets the depth/evidence checklist; impressions triple from the 35-impression baseline; 5 long-tail queries reach the top 20.

### Phase 2 — Days 30–120: authority and distribution

| Action | Target | Owner |
|---|---|---|
| Listicle outreach | 30 personalized pitches; 5+ inclusions | Owner/engineering support |
| Directory listings | AlternativeTo, SaaSHub, Slant, Peerlist, Uneed, Microlaunch | Owner |
| Product Hunt | Launch after 20+ template pages | Owner |
| WordPress.org | Follow up on the existing review; do not resubmit | Owner |
| Data study | Survey 100+ site owners; publish methodology and limitations | Engineering/owner |
| Expert commentary | 4–6 pitches to newsletters/podcasts | Owner |
| Community answers | 2–3 useful answers per week; disclose affiliation | Owner |

**Gate:** 10–20 quality referring domains; 5+ listicle inclusions; 100+ non-brand clicks per month.

### Phase 3 — Months 3–6: scale the content system

Build to **100+ quality pages**:

- 45 template pages in waves of 8–10, each with a real preview and 800–1,200 unique words.
- 20 comparison pages, including every major competitor.
- 15 platform/integration guides.
- 15 informational guides.
- 10 tools/data pages.

Do not publish 20 thin pages a week. A realistic solo cadence is **2–3 quality pages per week**, with one refresh day.

**Gate:** 100+ indexed pages; 50+ referring domains; 1,000+ organic clicks per month; 20 long-tail queries in the top 10.

### Phase 4 — Months 6–18: head terms

Only after the site has:

- 100+ quality pages.
- 50+ referring domains.
- Real reviews and case studies.
- Consistent brand searches.
- A monthly refresh cadence.

Then target:

- `free popup builder`
- `popup builder`
- `wordpress popup plugin`
- `exit intent popup`

**Gate:** page 1 for 3–5 head terms; #1 for the no-limits wedge first. Do not promise #1 for `popup builder` before the authority exists.

---

## 7. A content system that scales without thin pages

### 7.1 Five page types

| Type | Length | Must include | Primary metric |
|---|---:|---|---|
| Money/comparison | 2,500–3,500 | Dated table, screenshots, migration, who it is for, FAQ, author | Non-brand clicks, signups |
| Platform guide | 2,000–2,500 | Step-by-step, code, screenshots, troubleshooting, video | Top-10 rankings, installs |
| Template detail | 800–1,200 | Real preview, use cases, copy examples, trigger/frequency, FAQ | Long-tail impressions, template starts |
| Informational | 1,500–2,500 | Original explanation, examples, sources, decision tree | Top-20 rankings, links |
| Tool/data | 1,000–2,000 + tool | Methodology, limitations, embeddable result | Referring domains, citations |

### 7.2 Brief template

Every page starts with a one-page brief:

1. **Query and intent.** What is the searcher trying to do?
2. **SERP gap.** What do the top 5 results fail to answer?
3. **Unique angle.** What can PopupLoom show that competitors cannot?
4. **Evidence.** Which screenshots, test results, vendor sources or examples will prove it?
5. **Outline.** H2/H3 structure, with the answer in the first 100 words.
6. **Internal links.** 1 money page, 2 sibling pages, 1 guide.
7. **Schema.** Which types describe visible content?
8. **CTA.** One primary action, one secondary action.
9. **QA.** The checklist below.

### 7.3 QA checklist

- [ ] 2,500+ words for money/comparison; 800+ for templates.
- [ ] Answer in the first 100 words; no throat-clearing.
- [ ] 8+ real screenshots or annotated examples.
- [ ] 5+ external citations, each dated and linked.
- [ ] A comparison table with "last verified" date.
- [ ] "Who it is for / who it is not for."
- [ ] 5–8 FAQs based on real queries.
- [ ] Named author/reviewer and visible date.
- [ ] 2+ schema blocks describing visible content.
- [ ] 8–12 contextual internal links with descriptive anchors.
- [ ] Canonical, title, description, OG image, alt text.
- [ ] No fabricated ratings, reviews, customer counts or certifications.
- [ ] Mobile check: no intrusive interstitial, readable at 360px.

### 7.4 Internal linking rules

- Every page links to one money page and two sibling pages.
- Use descriptive anchors, not "click here".
- Link from the homepage and guides hub to the top 10 commercial pages.
- Keep the guides hub as a real hub: every guide linked, every template category linked.
- Add breadcrumbs with visible text and matching schema.
- Fix orphan pages monthly by comparing the sitemap with internal link counts.

### 7.5 Refresh rules

- Top 20 pages: monthly.
- Money/comparison pages: whenever a vendor changes pricing or limits.
- Template pages: quarterly, or when a new template is added.
- Any page at position 8–20: improve depth, add links, rewrite the title/meta.
- Any page with no impressions after 8 weeks: rewrite, merge or remove.
- Any page with impressions but CTR <2% at positions 1–5: rewrite the title and description.

---

## 8. Authority without paid links

### 8.1 Linkable assets, ranked by return

| Asset | Why it earns links | Effort | Priority |
|---|---|---|---|
| "We tested 12 free popup builders" study | Original data, dated limits, screenshots; listicles must cite or update | High | 1 |
| Popup ROI calculator | Useful, embeddable, no signup | Medium | 2 |
| Popup copy swipe file | 50 original patterns; marketers share it | Medium | 3 |
| Competitor-limit tracker | Updated when vendors change limits; naturally cited | Medium | 4 |
| Exit-intent snippet generator | Developer-friendly; Stack Overflow/Dev.to answers | Medium | 5 |
| Accessibility checklist for popups | Under-served topic; cited by agencies | Low | 6 |

### 8.2 Outreach principles

- Pitch a **correction or addition**, not a favour.
- Lead with the dated fact, not the product.
- Link to the source page, not the homepage.
- Never ask for a paid placement.
- Never offer to pay for a link.
- If the page is accurate, say so and move on.
- Record every pitch and response in a simple sheet.

### 8.3 Directories and communities

- WordPress.org plugin (already in review; do not resubmit).
- GitHub main repo and embed repo.
- npm package if the wrapper is genuinely useful.
- Product Hunt after the page inventory and onboarding are ready.
- AlternativeTo, SaaSHub, Slant, Peerlist, Uneed, Microlaunch.
- G2/Capterra only if eligible; never invent reviews.
- Indie Hackers, relevant subreddits, Stack Overflow: answer real questions, disclose affiliation.

### 8.4 What not to do

- No paid links, PBNs or link exchanges.
- No mass guest posts on irrelevant sites.
- No fake reviews, ratings, testimonials or customer logos.
- No "as seen in" claims without a real mention.
- No AI-spun mass pages.
- No keyword-stuffed doorway pages.
- No competitor trademark in domains or ads.
- No intrusive mobile interstitials.
- No ads on new SEO pages until they are reviewed and added deliberately.
- No GA4.

---

## 9. Trust and conversion

PopupLoom has only two production users. That is a fact, not a failure, but it means the site cannot borrow social proof. It must earn trust through transparency.

Add:

- A public changelog with dated entries.
- A status page or uptime note.
- A plain-language security page: storage, retention, export, delete, subprocessors.
- A founder/about page with a real person and a real reason for building the product.
- A live demo or annotated screenshots above the fold.
- A clear "what is free" section: no pageview cap, no trial, no credit card, export anytime.
- A "limits" page that states what PopupLoom does not do (no email sending, no SMS, no consent checkbox, etc.).
- A visible "last verified" date on every comparison.
- Real reviews only when users volunteer; disclose any relationship.

The goal is not to look bigger than the product. It is to make the product's real advantages legible.

---

## 10. Measurement and decision rules

### 10.1 Weekly dashboard

| Metric | Source | Why it matters | First target |
|---|---|---|---:|
| Indexed pages | GSC Pages | Is the site participating? | 30+ |
| Impressions | GSC Performance | Is demand being seen? | 3x baseline |
| Clicks | GSC Performance | Is the site winning? | 100+/month |
| CTR | GSC Performance | Are titles/meta working? | 2%+ |
| Average position | GSC Performance | Are pages moving? | Top 20 for 5 queries |
| Referring domains | GSC Links / Bing | Is authority growing? | 10–20 |
| Brand queries | GSC Queries | Is the brand known? | First appearance |
| Signups | D1 | Is traffic qualified? | First non-brand signup |
| Widgets saved | D1 | Is onboarding working? | Activation rate |
| Widgets with first lead | D1 | Is value delivered? | First lead |

### 10.2 Decision rules

| Signal | Action |
|---|---|
| No impressions after 8 weeks | Rewrite the angle, merge or remove. |
| Position 8–20 | Add depth, screenshots, citations and internal links. |
| Position 1–5, CTR <2% | Rewrite title and description; test the promise. |
| Impressions rising, clicks flat | Check intent match and title/description. |
| Cluster has no top-20 after 90 days | Change the angle or stop the cluster. |
| Indexed but no clicks after 90 days | Check whether the page answers the query. |
| Links earned but no ranking movement | Improve content depth and internal links. |
| Rankings but no signups | Fix the CTA, demo and onboarding. |

### 10.3 Leading vs lagging indicators

- **Leading:** indexed pages, impressions, average position, referring domains, listicle inclusions, brand searches.
- **Lagging:** clicks, signups, activation, leads, revenue.

Do not judge the plan on signups in week 2. Judge it on leading indicators first, then on lagging indicators after 60–90 days.

---

## 11. What would make the biggest difference fastest

If only five things can be done in the next 30 days:

1. **Export GSC Pages and Queries** to `seo/` so the site can see positions 8–20.
2. **Rebuild the no-limits money page** to 3,000 words with 10+ screenshots, dated vendor limits, a test log and an author.
3. **Rebuild the OptinMonster alternative page** to 2,500 words with hands-on screenshots, pricing, migration and FAQs.
4. **Pitch 20 listicles** with the dated no-limits comparison; aim for 3–5 inclusions.
5. **Publish the ROI calculator and the copy swipe file** as linkable assets.

Everything else compounds from those five.

---

## 12. Owner-only actions

These cannot be completed by engineering alone:

- [ ] Export GSC Pages and Queries CSVs to `seo/`.
- [ ] Recheck Bing Webmaster Index Explorer and request the top 10 URLs.
- [ ] Publish the AdSense US-states message.
- [ ] Enable Cloudflare MFA (TOTP).
- [ ] Follow up on SOCRadar (~17 November 2026).
- [ ] Create/claim directory accounts: Product Hunt, AlternativeTo, SaaSHub, Slant, Peerlist, Uneed, Microlaunch.
- [ ] Follow up on the WordPress.org plugin review; do not resubmit.
- [ ] Approve the outreach identity and send the first 20 pitches.
- [ ] Ask real users for reviews only when they volunteer.

---

## 13. Sources and method

### Internal sources

- `private-data/gsc-performance.json` — Search Console capture, 10 November 2026.
- `docs/SEO_QUERY_REVIEW_2026-11-10.md` — query and indexation review.
- `docs/SEO_GROWTH_PLAN.md` — existing strategy, roadmap and guardrails.
- `docs/SEO_OUTREACH.md` — Bing status, directories and outreach template.
- `docs/SEO_SCORECARD.md` — site-health snapshot, refreshed 16 November 2026.
- `sitemap.xml` — 45 URLs.

### External checks

- Live DuckDuckGo/Bing SERP checks, 15–16 November 2026.
- Live competitor page fetches, 16 November 2026.
- Verisign RDAP for `popuploom.com`: registration 1 November 2026.
- Wayback CDX: first capture 1 November 2026.
- Live HTTP header, canonical, robots and sitemap checks after deployment, 16 November 2026.

### Limits

- GSC data is a small, early sample. Do not treat 35 impressions as a stable baseline.
- No paid rank tracker or backlink index was connected. GSC's 0 external links is the authoritative signal available.
- Competitor word counts are snapshots and may include navigation or miss JavaScript-rendered content.
- PageSpeed Insights quota was exhausted during this pass; Core Web Vitals were not independently measured. Check the GSC CWV report.
- No ranking, traffic, review, certification or security claim is made.
- The plan is evidence-based, not a guarantee. Search results also depend on product quality, competition, algorithm changes and execution speed.

---

## Appendix: foundation fixes deployed on 16 November 2026

### What changed

1. **Public-page caching.** Ad-free public HTML now returns `Cache-Control: public, max-age=0, must-revalidate`; pages with a per-request ad nonce return `private, max-age=0, must-revalidate`; private/app pages stay `no-store`; crawler files such as `sitemap.xml` and `robots.txt` are revalidated.
2. **One guides canonical.** `/guides/` is the canonical URL. `/guides/index.html` returns a permanent redirect to `/guides/`. Every internal link, the sitemap, `llms.txt` and `llms-full.txt` now use `/guides/`.
3. **Internal link cleanup.** The guides URL was replaced across 45 HTML pages, the sitemap and the generator scripts.

### Verification

| Check | Result |
|---|---|
| `npm test` | 55/55 |
| `npm run test:cf` | 20/20 |
| `npm run test:cf:integration` | 140/140 |
| Live `/` cache | `private, max-age=0, must-revalidate`; ad unit present |
| Live `/privacy.html` cache | `public, max-age=0, must-revalidate` |
| Live `/studio.html` cache | `no-store`; `noindex, nofollow` |
| Live `/sitemap.xml` cache | `public, max-age=0, must-revalidate` |
| Live `/guides/index.html` | 308 to `https://popuploom.com/guides/` |
| Live `/guides/` | 200; canonical `https://popuploom.com/guides/`; ad unit present |
| Sitemap audit | 45 URLs; 0 bad status/canonical/noindex |
| IndexNow | 45 URLs; HTTP 200 |
| SEO scorecard | 45 pages; 0 issues; 873 average words; 45/45 schema |

**Worker version:** `eb8c17df-5a1a-46d2-aa7c-929782495a42`

**Not changed:** AdSense eligibility, the 20-page ad allowlist, CSP nonce handling, ad injection, private-page `no-store`, auth, webhooks, D1, lead data, the legacy `/popforge.js` path, or the Worker/D1 names.

---

## Bottom line

PopupLoom is not #1 because it has not yet earned the evidence required to be #1: indexation, authority, depth, proof and distribution. The technical foundation is now cleaner than it was this morning, but the strategy has to move from "publish more pages" to "make each page the best answer, then earn the links and brand signals that make it discoverable."

The first realistic win is the no-limits wedge in 4–8 months. The head term is a 12–24 month project. The plan above is designed to compound toward it without inventing rankings, reviews or claims.
