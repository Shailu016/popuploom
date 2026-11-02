# SEO implementation

Canonical site: https://popuploom.com/

Implemented for the production PopupLoom domain:

- Unique page titles/descriptions/canonicals with apex HTTPS URLs
- Open Graph and Twitter cards using `/assets/og-popuploom.png`
- Truthful Organization, WebSite, SoftwareApplication, FAQPage, CollectionPage and TechArticle JSON-LD with stable IDs: `https://popuploom.com/#organization`, `/#website`, `/#app`
- `HowTo` JSON-LD on the installation guide whose four steps mirror the visible numbered headings verbatim, with no invented times or ratings
- `BreadcrumbList` JSON-LD on the template catalog and guide, each matching a visible `Home › …` breadcrumb line
- Visible FAQs matching the structured data
- A static catalog of 45 templates and an installation guide
- `sitemap.xml` containing only `/`, `/templates.html` and `/guides/install-popups.html`
- `robots.txt` advertising the apex sitemap
- `llms.txt` product summary, explicitly not a ranking or AI-visibility promise
- `llms-full.txt`: extended machine-readable documentation (builder facts, embed format, limits, verbatim FAQ text), linked from `llms.txt` and served on the public allowlist
- noindex editor/account/demo/recovery pages
- canonical `/index.html` → `/` redirect and real 404s
- regenerated per-page CSP hashes

Public indexing targets: `/`, `/templates.html`, `/guides/install-popups.html`. The sitemap excludes app/account/API routes and the migration page. Unknown paths return 404 rather than duplicate homepage content. Account authorization remains enforced independently of robots.txt.

Validation: the Worker integration suite (92 assertions) and the application/browser suite (29 groups) pass. JSON-LD is parsed for syntax and checked against visible product content: HowTo steps mirror the visible guide headings and sentences, and breadcrumb markup matches the visible breadcrumb lines. No fake reviews, backlinks, ratings or ranking claims were added. This is not a claim of Google rich-result eligibility.

AI discovery: ordinary search and retrieval bots may crawl public content under the general robots rules. `llms.txt` is an optional summary, not an indexing standard or ranking signal guarantee. No hidden instructions to AI systems or model-training opt-in settings were introduced. Google states that foundational SEO practices apply to its AI search features, with no special AI schema required. OpenAI documents search crawling separately from model-training crawling.

Primary references:
- https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes
- https://developers.google.com/search/docs/appearance/ai-features
- https://developers.openai.com/api/docs/bots

## Domain and webmaster status

As of 2026-11-02, the GoDaddy registration delegates to Cloudflare, and apex/www are attached to the existing Worker in the Gmail account. HTTPS and the first rebranded deployment passed live checks. Legacy page redirects are enabled only after those checks; legacy embeds, APIs and draft recovery remain directly available.

Webmaster actions requiring the owner's account verification:

1. Add/verify `https://popuploom.com/` in Google Search Console, submit `/sitemap.xml`, and use Change of Address from the old URL-prefix property if verified and eligible.
2. Add the site to Bing Webmaster Tools or import a verified Search Console property, then submit the same sitemap.

Verification tokens must come from the owner's own webmaster account; none were invented. Google/Bing indexing, citations by AI tools, real-user Core Web Vitals and rankings require observation after launch. No worldwide ranking or recommendation is guaranteed.

Keep permanent page redirects for at least a year, preferably longer. Legacy embed/API support on the old host may need to remain indefinitely.
