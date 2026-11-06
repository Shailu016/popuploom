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
- `sitemap.xml` containing only public, indexable pages: the homepage, template catalog, guide hub, nine guides and the four trust pages
- `robots.txt` advertising the apex sitemap
- `llms.txt` product summary, explicitly not a ranking or AI-visibility promise
- `llms-full.txt`: extended machine-readable documentation (builder facts, embed format, limits, verbatim FAQ text), linked from `llms.txt` and served on the public allowlist
- noindex editor/account/demo/recovery pages
- canonical `/index.html` → `/` redirect and real 404s
- regenerated per-page CSP hashes
- optional site-verification wiring (owner-supplied values only; see below)

Public indexing targets: `/`, `/templates.html`, `/guides/index.html`, the six installation/lead/troubleshooting guides, the three use-case guides and the four trust pages. The sitemap excludes app/account/API routes and the migration page.

## Use-case landing pages

Three original, substantive guides target the site's main buyer types. Each has a unique title, description, canonical, Open Graph/Twitter card, `BreadcrumbList` + `TechArticle` + `FAQPage` JSON-LD, and internal links to the relevant templates, installation guides and sibling use-case pages:

- `/guides/popup-builder-for-ecommerce.html` — first-order offers, cart-page exit intent, free-shipping bars, back-in-stock alerts, review requests, margin and platform limits.
- `/guides/popup-builder-for-quick-commerce.html` — serviceability and launch notices, app-install prompts, reorder offers, operational updates, and an explicit statement that PopupLoom is a website widget rather than a native app SDK.
- `/guides/popup-builder-for-lead-generation.html` — lead magnets, webinars, waitlists, demo requests, form-field limits, consent copy, CSV export and webhook paths.

The guides are linked from the homepage use-case section, the guide hub and the template catalog. They are not thin doorway pages: each explains what the product cannot do as well as what it can. Their FAQ markup mirrors the visible FAQ text, and no conversion, revenue or ranking claim is made.

## AI and LLM discovery

Search and answer engines see the same public HTML as ordinary crawlers. The site does not use cloaking, hidden text or AI-specific instructions.

- `robots.txt` names the major retrieval and answer crawlers explicitly (`GPTBot`, `OAI-SearchBot`, `ChatGPT-User`, `PerplexityBot`, `ClaudeBot`, `Google-Extended`, `Applebot-Extended`, `CCBot` and others) and allows public pages while keeping app, account, lead and recovery surfaces excluded.
- `llms.txt` is a structured, factual product summary: pricing, account rules, capabilities, limitations, use cases, common questions and canonical links. `llms-full.txt` adds builder facts, embed format, scope boundaries and limits. Both are served as `text/plain` and linked from key pages with `<link rel="alternate" type="text/plain">`.
- `/faq.html` is a dedicated, indexable FAQ with 21 visible answers and matching `FAQPage` JSON-LD, plus a visible key-facts table. It covers free pricing, account requirements, templates, triggers, WordPress/Shopify/Webflow/Wix support, leads, CSV, webhooks, technical limits and what the product does not do.
- The homepage `Organization` and `SoftwareApplication` markup now state the product description, subcategory and `isAccessibleForFree`.

This improves machine readability and retrieval. It does **not** guarantee that ChatGPT, Gemini, Claude, Perplexity or Copilot will recommend PopupLoom. Model answers are influenced heavily by third-party sources: search-index inclusion, independent listicles, directories, reviews, community mentions and the model's own training data. No `llms.txt` file is an official ranking standard. The owner still needs to earn external mentions and keep public facts consistent. Unknown paths return 404 rather than duplicate homepage content. Account authorization remains enforced independently of robots.txt.

Validation: the Worker integration suite (92 assertions) and the application/browser suite (29 groups) pass. JSON-LD is parsed for syntax and checked against visible product content: HowTo steps mirror the visible guide headings and sentences, and breadcrumb markup matches the visible breadcrumb lines. No fake reviews, backlinks, ratings or ranking claims were added. This is not a claim of Google rich-result eligibility.

AI discovery: ordinary search and retrieval bots may crawl public content under the general robots rules. `llms.txt` is an optional summary, not an indexing standard or ranking signal guarantee. No hidden instructions to AI systems or model-training opt-in settings were introduced. Google states that foundational SEO practices apply to its AI search features, with no special AI schema required. OpenAI documents search crawling separately from model-training crawling.

Primary references:
- https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes
- https://developers.google.com/search/docs/appearance/ai-features
- https://developers.openai.com/api/docs/bots

## Domain and webmaster status

As of 2026-11-02, the GoDaddy registration delegates to Cloudflare, and apex/www are attached to the existing Worker in the Gmail account. HTTPS and the first rebranded deployment passed live checks. Legacy page redirects are enabled only after those checks; legacy embeds, APIs and draft recovery remain directly available.

Webmaster status:

1. Google Search Console is verified for `sc-domain:popuploom.com`; `/sitemap.xml` is submitted and indexing has been requested for the three use-case playbooks, the guides hub, the FAQ and the press kit.
2. Bing Webmaster Tools still needs the owner to import the verified Search Console property (or verify manually) and confirm the same sitemap. Expect that to feed Bing and Copilot discovery.
3. IndexNow is wired: the key file is served at `/ccf2a9f45165c635253d22748df4a573.txt`, and `npm run indexnow` submits every sitemap URL to `api.indexnow.org` after a deployment.

Verification tokens must come from the owner's own webmaster account; none were invented. Google/Bing indexing, citations by AI tools, real-user Core Web Vitals and rankings require observation after launch. No worldwide ranking or recommendation is guaranteed.

### Site verification implementation

The application side of verification is wired so the owner never edits code:

- **Meta method:** set the `SITE_VERIFICATION_METAS` secret (or env) as comma-separated `name=content` pairs, for example `google-site-verification=AbC123...,msvalidate.01=0123...`. Every build injects exactly those `<meta name=… content=…>` tags before `</head>` on all public pages. Values are validated against a strict charset; anything unsafe or unparsable is silently dropped rather than rendered.
- **Drop-file method:** place the file Search Console or Bing hands you (`google*.html`, e.g. `googled9222a9e1190a4db.html`, or `BingSiteAuth.xml`) in the repository root on the machine that deploys, and run `npm run deploy:cf`. The build copies such files into the public bundle and both runtimes serve them on every host with `Cache-Control: no-store` and the standard security headers. These filenames are gitignored so tokens are never committed.
- In both runtimes, a matching filename with no actual file — and any lookalike, traversal or suffix variant — returns the same hardened 404 as any unknown path; the filename pattern (`^google[a-z0-9]{12,32}\.html$` or `^BingSiteAuth\.xml$`, case-insensitive) is the only gate.

Validation: the Worker integration suite (96 assertions) and the application/browser suite (30 groups) pass. JSON-LD is parsed for syntax and checked against visible product content: HowTo steps mirror the visible guide headings and sentences, and breadcrumb markup matches the visible breadcrumb lines. No fake reviews, backlinks, ratings or ranking claims were added. This is not a claim of Google rich-result eligibility.

Keep permanent page redirects for at least a year, preferably longer. Legacy embed/API support on the old host may need to remain indefinitely.

## Off-site citations and directories

On-page work cannot make an AI assistant recommend the product by itself. The owner-facing playbook lives in `docs/AI_AND_DIRECTORY_SUBMISSION_PACK.md`, with a status tracker in `docs/DIRECTORY_TRACKER.csv`.

- `/press.html` holds approved one-line, short, medium and long descriptions, key facts, logo/screenshot links and claim rules. Directories should copy from it rather than invent wording.
- Approved assets are under `/assets/press/` (512 and 256 logos, SVG mark, 1200×630 social image, desktop and mobile screenshots).
- Priority profiles: Bing Webmaster Tools, Product Hunt, AlternativeTo, SaaSHub, G2, Capterra/GetApp/Software Advice, Crunchbase and Trustpilot.
- Launch and indie directories are secondary and should use consistent name, URL, price and category.
- Independent listicle outreach is included with templates. Vendor-owned roundups are not prioritised.
- After profiles exist, their URLs should be added to `Organization.sameAs`. No profile URLs are invented in the markup.

No paid links, fake reviews, mass directory spam or AI-only hidden instructions are used.
