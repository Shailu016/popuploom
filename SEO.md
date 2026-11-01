# SEO implementation

Canonical site: https://popuploom.com/

Prepared in this release (identity and metadata are implemented in the repository; production cutover is gated on the domain):

- Unique page titles/descriptions/canonicals with apex HTTPS URLs
- Open Graph and Twitter cards using `/assets/og-popuploom.png`
- Truthful Organization, WebSite, SoftwareApplication, FAQPage, CollectionPage and TechArticle JSON-LD with stable IDs: `https://popuploom.com/#organization`, `/#website`, `/#app`
- Visible FAQs matching the structured data
- A static catalog of 45 templates and an installation guide
- `sitemap.xml` containing only `/`, `/templates.html` and `/guides/install-popups.html`
- `robots.txt` advertising the apex sitemap
- `llms.txt` product summary, explicitly not a ranking or AI-visibility promise
- noindex editor/account/demo/recovery pages
- canonical `/index.html` → `/` redirect and real 404s
- regenerated per-page CSP hashes

Public indexing targets: `/`, `/templates.html`, `/guides/install-popups.html`. The sitemap excludes app/account/API routes and the migration page. Unknown paths return 404 rather than duplicate homepage content. Account authorization remains enforced independently of robots.txt.

Validation: the Worker integration suite (79 assertions) and the application/browser suite (26 groups) pass. JSON-LD is parsed for syntax and checked against visible product content. No fake reviews, backlinks, ratings or ranking claims were added. This is not a claim of Google rich-result eligibility.

AI discovery: ordinary search and retrieval bots may crawl public content under the general robots rules. `llms.txt` is an optional summary, not an indexing standard or ranking signal guarantee. No hidden instructions to AI systems or model-training opt-in settings were introduced. Google states that foundational SEO practices apply to its AI search features, with no special AI schema required. OpenAI documents search crawling separately from model-training crawling.

Primary references:
- https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes
- https://developers.google.com/search/docs/appearance/ai-features
- https://developers.openai.com/api/docs/bots

## Domain and webmaster status

As of 2026-11-01, `popuploom.com` is registered through GoDaddy and still uses GoDaddy nameservers (`ns13/ns14.domaincontrol.com`). There is no Cloudflare zone for the domain in the production Cloudflare account, so the apex is not yet attached to the existing Worker and the new canonical URLs are not live. The old host remains the working production origin for Release A.

Required owner actions before the canonical cutover:

1. Add `popuploom.com` as an active zone in the `shailu3597@gmail.com` Cloudflare account.
2. Review and recreate any required records (mail/SPF/DKIM/DMARC/verification) at Cloudflare, then change the GoDaddy nameservers.
3. Attach `popuploom.com` and `www.popuploom.com` to the existing `popforge` Worker as Custom Domains.
4. Verify apex HTTPS, `www` → apex redirects, both runtime paths, and old/new embeds.
5. Add/verify the `https://popuploom.com/` property in Google Search Console, submit `/sitemap.xml`, and use Change of Address from the old URL-prefix property if it is verified and eligible.
6. Add the site to Bing Webmaster Tools or import the verified Search Console property, then submit the same sitemap.

Verification tokens must come from the owner's own webmaster account; none were invented. Google/Bing indexing, citations by AI tools, real-user Core Web Vitals and rankings require observation after launch. No worldwide ranking or recommendation is guaranteed.

Keep permanent page redirects for at least a year, preferably longer. Legacy embed/API support on the old host may need to remain indefinitely.
