# PopupLoom: AI discovery and directory submission pack

Last updated: 2026-11-06

This pack is for the site owner. It keeps every public listing consistent, gives exact copy to paste, and separates high-value directories from low-value link farms. Nothing here promises that ChatGPT, Gemini, Claude, Perplexity or Copilot will recommend PopupLoom. Model answers are influenced by search indexes, training data, third-party citations and reviews. This pack improves the parts we control.

---

## 1. What is already implemented

| Item | Status |
| --- | --- |
| Google Search Console | Verified for `sc-domain:popuploom.com`; sitemap submitted |
| Google indexing requests | Ecommerce, quick commerce, lead generation, guides hub and FAQ requested |
| Sitemap | `https://popuploom.com/sitemap.xml` — 18 public URLs |
| AI crawler access | `robots.txt` explicitly allows GPTBot, OAI-SearchBot, ChatGPT-User, PerplexityBot, ClaudeBot, Google-Extended, Applebot-Extended, CCBot and others |
| `llms.txt` | Structured product facts, limits, use cases, Q&A and canonical links |
| `llms-full.txt` | Extended machine-readable documentation |
| FAQ page | `https://popuploom.com/faq.html` — 21 Q&As with matching `FAQPage` markup |
| Press kit | `https://popuploom.com/press.html` — approved descriptions, logos, screenshots |
| IndexNow | Key file live at `https://popuploom.com/ccf2a9f45165c635253d22748df4a573.txt`; run `npm run indexnow` after deploy |
| Structured data | Organization, WebSite, SoftwareApplication, FAQPage, TechArticle, BreadcrumbList, CollectionPage |

### IndexNow

After every production deploy:

```bash
npm run indexnow
```

This posts all sitemap URLs to `api.indexnow.org`, which distributes to Bing, Yandex, Seznam and partners. Bing indexing also feeds Microsoft Copilot and some third-party answer engines.

---

## 2. Canonical facts — use these everywhere

Inconsistent facts are the most common reason directories and AI systems fail to match a brand. Do not improvise new numbers.

| Field | Value |
| --- | --- |
| Name | PopupLoom |
| Previous name | PopForge (legacy embed domain only; not the current product name) |
| Website | https://popuploom.com/ |
| Category | Website popup builder / lead-capture widget |
| Tagline | Free website popup builder with 53 templates |
| Price | Free |
| Free plan details | No credit card, no trial timer, no paid upgrade inside the product |
| Account | Optional to design and preview; required to save and install |
| Templates | 53 original starting designs, plus a blank canvas |
| Triggers | Page load, delay, scroll depth, scroll to element, click, desktop exit intent |
| Targeting | Include/exclude page paths with wildcards; desktop and phone separately; six frequency modes |
| Install | Two-line snippet before the closing body tag |
| Leads | Authenticated lead inbox, CSV export, optional browser or signed server-side webhook |
| Platforms | Any site that permits custom HTML/JavaScript; WordPress, Shopify storefronts, Webflow |
| Not included | Cart data, coupon generation, email/SMS sending, A/B testing, revenue attribution, native app SDK |
| Contact | shailu3597@gmail.com |
| Operator | Shailu, independent product |

### Short description (about 50 words)

> PopupLoom is a free website popup builder for small shops, ecommerce stores and lead-generation sites. It includes 53 templates, six popup triggers, page and device targeting, a hosted install snippet, a lead inbox and CSV export. No credit card or trial timer is required; a free account is needed to save and install a popup.

### Medium description (about 100 words)

> PopupLoom is a free website popup builder for site owners who can add custom HTML or JavaScript to their own website. The visual studio ships with 45 original templates and a blank canvas, plus page-load, delay, scroll-depth, scroll-to-element, click and desktop exit-intent triggers. Campaigns can target page paths with wildcards, enable desktop and phone separately, and use frequency rules to avoid repeat interruptions. A saved widget gives a two-line embed that loads a hosted configuration, so edits sync without replacing the snippet. Form responses appear in a lead inbox with CSV export and optional webhooks. There is no credit card step, trial timer or paid upgrade inside the product.

### One-liner (under 100 characters)

> Free website popup builder with 53 templates, hosted embed code and lead capture.

### Tags / keywords

Use 5–10, in this order:

```
popup builder, website popup, free popup builder, lead capture, exit intent, email signup popup, ecommerce popup, shopify popup, wordpress popup, lead generation
```

### Category suggestions by directory type

| Directory type | Suggested category |
| --- | --- |
| General software | Marketing / Conversion / Lead Generation |
| SaaS directory | Marketing Software / Website Builder / Lead Capture |
| Review platform | Marketing Automation or Conversion Rate Optimization |
| Startup directory | Marketing, Sales, Ecommerce |
| Launch platform | Marketing tools, No-code, Ecommerce |

Do not list PopupLoom under “AI tools” or “email marketing.” It is neither.

---

## 3. Brand and claim rules

- Write **PopupLoom** — one word, capital P and L.
- Never write “Popup Loom”, “PopUpLoom”, “Popuploom” or “PopForge” as the current name.
- Use “free website popup builder”. Do not call it a CRM, email platform, SMS platform, checkout tool or analytics suite.
- Do not claim awards, user counts, G2/Capterra ratings, “#1”, “best” or revenue lift unless a specific verified figure is supplied.
- Do not claim native mobile app support, cart recovery emails, coupon generation or A/B testing.
- Do not imply endorsement by WordPress, Shopify, Webflow, Google or any marketplace.
- Use the approved logo files from the press kit. Do not recolor or distort the mark.

Approved assets:

- https://popuploom.com/assets/press/popuploom-logo-512.png
- https://popuploom.com/assets/press/popuploom-logo-256.png
- https://popuploom.com/assets/press/popuploom-mark.svg
- https://popuploom.com/assets/press/popuploom-og-1200x630.png
- https://popuploom.com/assets/press/popuploom-templates-desktop.png
- https://popuploom.com/assets/press/popuploom-studio-desktop.png
- https://popuploom.com/assets/press/popuploom-studio-mobile.png

---

## 4. Directory plan

Work top-down. Do not submit to 100 directories in one day; inconsistent listings and low-quality links do more harm than good.

### Tier 0 — search and AI infrastructure (highest value)

| Directory | URL | Cost | Time | Notes |
| --- | --- | --- | --- | --- |
| Google Search Console | https://search.google.com/search-console | Free | Done | Sitemap submitted; indexing requested |
| Bing Webmaster Tools | https://www.bing.com/webmasters | Free | Done | Connected 2026-11-06. Sitemap resubmitted, 5 priority URLs requested, Site Scan queued. Feeds Bing and Copilot discovery |
| IndexNow | `npm run indexnow` | Free | 1 min | Run after every deploy |

#### Bing Webmaster status

Completed on 2026-11-06:

1. `popuploom.com` is connected in Bing Webmaster Tools.
2. `https://popuploom.com/sitemap.xml` was resubmitted and is processing.
3. **Request indexing** was accepted for:
   - `https://popuploom.com/guides/popup-builder-for-ecommerce.html`
   - `https://popuploom.com/guides/popup-builder-for-quick-commerce.html`
   - `https://popuploom.com/guides/popup-builder-for-lead-generation.html`
   - `https://popuploom.com/faq.html`
   - `https://popuploom.com/press.html`
4. A Site Scan named `PopupLoom public pages 2026-11-06` is queued and reports to the account email.
5. IndexNow is live. The first production submission returned HTTP 202 for all 18 sitemap URLs.

Review later: Bing **Sitemaps** URL count, **Site Explorer** coverage, **Site Scan** errors/warnings and **AI Performance** citations.

### Tier 1 — entity, comparison and review profiles

These are the listings most likely to be quoted by AI assistants and shown in “alternatives” searches.

| Directory | Submit URL | Cost | What to prepare |
| --- | --- | --- | --- |
| Product Hunt | https://www.producthunt.com/posts/new | Free | Logo 512, gallery screenshots, 60-char tagline, short description, first comment, 3–5 topics |
| AlternativeTo | https://alternativeto.net/manage/submit/ | Free | Name, URL, short description, license “Free”, platforms “Web”, alternatives list |
| SaaSHub | https://www.saashub.com/submit | Free | Name, URL, category, pricing “Free”, short description, logo |
| G2 | https://www.g2.com/products/new | Free listing | Business email, product category, description, logo, screenshots. Reviews need real users |
| Capterra | https://www.capterra.com/vendors/sign-up | Free listing | Same Gartner vendor account covers GetApp and Software Advice |
| GetApp | https://www.getapp.com/vendors/sign-up/ | Free listing | Use the same Capterra vendor account where offered |
| Software Advice | https://www.softwareadvice.com/vendors/ | Free listing | Same Gartner account |
| Crunchbase | https://www.crunchbase.com/ | Free profile | Company name, website, short description, founder, location, categories |
| Trustpilot | https://business.trustpilot.com/ | Free profile | Domain verification; invite real users only |
| TrustRadius | https://www.trustradius.com/vendor | Free listing | Vendor profile; reviews need real users |

**Important:** review platforms are for real customer reviews. Never buy, swap or fabricate reviews. A single fake review can get a profile removed and damage the brand.

#### AlternativeTo strategy

AlternativeTo ranks for “alternative to X” searches. Add PopupLoom as an alternative to tools people actually compare it with, but describe differences factually:

- OptinMonster
- Popupsmart
- Poptin
- Sleeknote
- Wisepops
- Privy
- BDOW (formerly Sumo)
- Popup Maker
- Elementor Popup Builder
- HubSpot popups

Suggested sentence:

> PopupLoom is a free website popup builder with 53 templates, hosted embed code and lead capture. It does not include email/SMS sending, cart data, A/B testing or native app messaging; those require other tools.

Do not write “better than” or make unverifiable claims about competitors.

### Tier 2 — launch and indie directories

| Directory | Submit URL | Cost | Notes |
| --- | --- | --- | --- |
| Uneed | https://www.uneed.best/submit | Free queue / paid date | Badge may be requested |
| MicroLaunch | https://microlaunch.net/submit | Free | Short, outcome-led copy |
| TinyLaunch | https://www.tinylaunch.com/ | Free tier | Check current rules |
| LaunchIgniter | https://launchigniter.com/submit | Free | Daily launch board |
| Peerlist Launchpad | https://peerlist.io/launchpad | Free | Developer/indie audience |
| Indie Hackers products | https://www.indiehackers.com/products | Free | Add product and a genuine build story |
| F6S | https://www.f6s.com/ | Free | Startup profile |
| Hacker News (Show HN) | https://news.ycombinator.com/submit | Free | Only with a genuine, useful post; follow the rules |
| Reddit | Relevant subreddits | Free | Read each community's self-promotion rules. Do not spam |

BetaList, AppSumo, Startup Stash and similar sites have paid or review-gated paths. Skip them until the free profiles are complete and there is a real launch reason.

### Tier 3 — independent listicle outreach

Vendor-owned roundups rarely add a free competitor. Prioritise independent writers and comparison sites. Verify the current page before emailing; many “best popup” lists are owned by popup vendors.

Starting targets found in current search results:

| Site | Page | Why |
| --- | --- | --- |
| divbyzero.com | `/blog/popup-software` | Independent, explicitly critiques vendor-owned rankings |
| maestra.io | `/blog/comparisons/best-popup-apps` | Broad comparison page |
| kiwistic.com | `/top-exit-intent-plugins-wordpress-2025` | WordPress exit-intent comparison |
| fs-code.com | `/blog/best-wordpress-popup-plugins` | WordPress plugin roundup |
| learnpresslms.com | `/blog/best-popup-maker-wordpress-plugin-picks` | WordPress roundup |
| teamupdraft.com | `/blog/best-popup-plugin-wordpress` | WordPress roundup |
| hostpapa.com | `/blog/web-design-development/best-free-exit-intent-popups-for-wordpress` | Free-focused roundup |
| navona.ai | `/blog/best-exit-intent-popup-apps-for-shopify-2026` | Shopify comparison |

Notes:

- Avoid pitching direct competitors' blogs (Wisepops, Popupsmart, Poptin, Sleeknote, Popup Maker, OptinMonster, Elementor). They have little reason to add a free rival.
- If a page is outdated, lead with the specific missing fact, not a generic “please add us.”
- Offer a free account and screenshots. Do not offer payment for a link; paid links without disclosure can violate search guidelines.

---

## 5. Product Hunt launch plan

Product Hunt is one shot per product. Prepare before launching.

### Assets

- Logo: `popuploom-logo-512.png`
- Gallery: template catalog, studio desktop, studio mobile, plus a simple 3-panel “build → embed → capture” image if time allows
- Thumbnail: 240×240 crop of the logo (the 512 file works)
- Tagline (60 chars max): `Free website popup builder with 53 templates`
- Topics: Marketing, No-code, Ecommerce, Lead Generation, Website Builder
- First comment: founder story + what is free + what it does not do

### First comment draft

> Hi Product Hunt — I built PopupLoom because most popup tools either charge monthly or cap the useful features. PopupLoom is free: 53 templates, six triggers, page/device targeting, a hosted two-line embed, a lead inbox and CSV export. No credit card and no trial timer.
>
> It is intentionally focused. It does not send email/SMS, read cart data, generate coupons, run A/B tests or work inside native apps. If you need those, keep your existing stack and use PopupLoom for the popup layer.
>
> I would love feedback on the template gallery and the install flow. Happy to answer anything.

### Launch-day checklist

- [ ] Product page approved and scheduled
- [ ] All gallery images uploaded
- [ ] First comment ready to paste
- [ ] Founder available for 8–12 hours to reply
- [ ] 5–10 real supporters notified (no vote rings, no incentivised upvotes)
- [ ] Social posts prepared
- [ ] UTM links ready: `?utm_source=producthunt&utm_medium=launch&utm_campaign=free-popup-builder`
- [ ] Monitor signups and support email
- [ ] Reply to every substantive comment

### After launch

- Add the Product Hunt profile URL to `Organization.sameAs` on the homepage and press page.
- Add a “Featured on Product Hunt” line only if the listing is live.
- Do not claim a ranking or badge you did not receive.

---

## 6. Outreach templates

### A. Independent listicle inclusion

Subject: `Free popup builder for your [year] roundup`

> Hi [Name],
>
> I read your [article title] while checking which free popup tools are still actually free. One option missing from the list is PopupLoom (https://popuploom.com/): a free website popup builder with 53 templates, six triggers, page/device targeting, a hosted embed and CSV lead export. No credit card or trial timer.
>
> It is not a fit for every section — it does not send email/SMS, read cart data or run A/B tests — so I am not asking you to replace anything. If you cover “free, no card” options, it may be a useful addition.
>
> Press facts and assets: https://popuploom.com/press.html
>
> Happy to answer questions or send a screenshot you can use.
>
> Shailu
> PopupLoom

### B. Follow-up (7 days later)

Subject: `Re: Free popup builder for your [year] roundup`

> Hi [Name] — just following up once. If the roundup is already closed, no problem. If you need a specific fact for verification, the press kit has approved descriptions, limits and screenshots: https://popuploom.com/press.html
>
> Thanks,
> Shailu

### C. Directory editor / review platform

Subject: `PopupLoom listing details`

> Hi [Name],
>
> I am submitting PopupLoom, a free website popup builder, to [directory]. The listing details are:
>
> - Name: PopupLoom
> - URL: https://popuploom.com/
> - Category: Marketing / Lead Generation / Website popup builder
> - Pricing: Free; no credit card or trial timer
> - Description: [paste the 50-word description]
> - Logo: https://popuploom.com/assets/press/popuploom-logo-512.png
>
> It does not include email/SMS sending, cart data, coupon generation, A/B testing or native app messaging. Please let me know if you need anything else.
>
> Shailu

### D. Review request to a real user

Subject: `Would you review PopupLoom?`

> Hi [Name],
>
> You have been using PopupLoom for [use case]. If you have two minutes, an honest review on [platform] would help other site owners decide whether it fits. A short note about what worked and what did not is more useful than a perfect score.
>
> Link: [profile URL]
>
> No pressure, and thank you for using the tool.
>
> Shailu

Never offer discounts, gifts or reciprocal reviews in exchange for a review.

---

## 7. Measurement

Track these weekly:

| Metric | Source |
| --- | --- |
| Indexed pages | Google Search Console → Pages; Bing Webmaster → Site Explorer |
| Sitemap read status | GSC Sitemaps; Bing Sitemaps |
| Impressions and clicks | GSC Performance; Bing Search Performance |
| Referral sessions | Your analytics, filtered by `utm_source` |
| Signups by source | Account signup records if you store a source field; otherwise referral sessions |
| Directory profile views | Each platform's dashboard |
| Reviews | G2, Capterra, Trustpilot, TrustRadius |

Use UTMs on every profile link:

```
https://popuploom.com/?utm_source=producthunt&utm_medium=directory&utm_campaign=launch
https://popuploom.com/?utm_source=alternativeto&utm_medium=directory&utm_campaign=free-popup-builder
https://popuploom.com/?utm_source=saashub&utm_medium=directory&utm_campaign=free-popup-builder
https://popuploom.com/?utm_source=g2&utm_medium=directory&utm_campaign=free-popup-builder
https://popuploom.com/?utm_source=capterra&utm_medium=directory&utm_campaign=free-popup-builder
```

Do not use UTMs on the canonical `https://popuploom.com/` links inside the site itself.

---

## 8. After profiles exist: add `sameAs`

Once profiles are live, add their URLs to the `Organization` markup on `index.html` and `press.html`:

```json
"sameAs": [
  "https://www.producthunt.com/products/popuploom",
  "https://alternativeto.net/software/popuploom/about/",
  "https://www.saashub.com/popuploom",
  "https://www.g2.com/products/popuploom",
  "https://www.crunchbase.com/organization/popuploom"
]
```

Only add URLs that exist and that you control or have claimed. Do not invent profile URLs.

---

## 9. Four-week schedule

### Week 1 — infrastructure and top profiles

- [ ] Bing Webmaster Tools: import GSC, confirm sitemap
- [ ] Run `npm run indexnow`
- [ ] Product Hunt page prepared
- [ ] AlternativeTo submission
- [ ] SaaSHub submission
- [ ] Crunchbase profile

### Week 2 — review platforms

- [ ] G2 vendor profile
- [ ] Capterra / GetApp / Software Advice via Gartner vendor account
- [ ] Trustpilot domain profile
- [ ] Ask 3–5 real users for honest reviews

### Week 3 — launch

- [ ] Product Hunt launch
- [ ] Uneed, MicroLaunch, Peerlist, LaunchIgniter
- [ ] Indie Hackers product page
- [ ] Show HN only if there is a genuine story

### Week 4 — citations and cleanup

- [ ] Send 10 listicle outreach emails
- [ ] Follow up once
- [ ] Audit every listing for consistent name, URL, pricing and category
- [ ] Add `sameAs` URLs
- [ ] Review GSC and Bing coverage
- [ ] Remove or correct any listing that misdescribes the product

---

## 10. What not to do

- Do not buy links or reviews.
- Do not mass-submit the same text to hundreds of low-quality directories.
- Do not use “best”, “#1”, “leading” or fabricated statistics.
- Do not create fake comparison pages that misrepresent competitors.
- Do not add hidden text or AI-only instructions to public pages.
- Do not claim that `llms.txt` guarantees AI recommendations.
- Do not list PopupLoom as an AI product, email platform or Shopify app.

---

## 11. Honest expectation

Directory listings and consistent facts improve the chance that search engines and AI systems retrieve correct information about PopupLoom. They do not force a model to recommend it. The strongest long-term signals are:

1. Real users describing the product accurately.
2. Independent articles that mention it by name with a link.
3. Consistent facts across every profile.
4. Search-index inclusion and crawlable, well-structured pages.
5. A product that actually does what the listing says.

Measure progress in months, not days.
