# PopupLoom SEO page map (scoped)

Updated: **2026-11-10**. Owner: CTO review. This is an architecture map, not a keyword dump. Volumes are unvalidated; Search Console data decides after 4–6 weeks.

## Guardrails

1. One intent per URL. No second page for an intent already owned.
2. Existing pages first: keep, fix or merge before adding.
3. Maximum **6 new pages** in the first batch.
4. Every new page needs tested, original instructions — no 300-word filler.
5. New pages join the ad allowlist only after they have real content.
6. No direct "X vs PopupLoom" pages until brand demand exists.

## Existing pages (keep unless noted)

| URL | Intent | Primary keyword | Title (live) | Action |
|---|---|---|---|---|
| `/` | Free builder | free popup builder | PopupLoom — Free Popup Builder for Websites | keep |
| `/templates.html` | Browse designs | popup templates | Free Website Popup Templates \| PopupLoom | keep |
| `/faq.html` | Product questions | popup builder faq | PopupLoom FAQ: Free Popup Builder Questions | keep |
| `/press.html` | Brand facts | popuploom | PopupLoom Press Kit and Brand Facts | keep |
| `/security.html` | Trust | popuploom security | Security and Responsible Disclosure | keep |
| `/about.html` | Company | popuploom about | About PopupLoom | keep |
| `/contact.html` | Support | popuploom contact | Contact PopupLoom | keep |
| `/terms.html` | Legal | popuploom terms | Terms | keep |
| `/privacy.html` | Legal/privacy | popuploom privacy | Privacy and data handling | keep |
| `/demo.html` | Product demo | popup demo | Boxcar Supply Co. \| PopupLoom demo site | keep, noindex |
| `/guides/index.html` | Guides hub | popup guides | Popup Guides: Ecommerce, Quick Commerce & Lead Gen | keep |
| `/guides/install-popups.html` | How to install | how to add a popup to a website | How to Add a Popup to Your Website | keep |
| `/guides/wordpress-popup.html` | WordPress | wordpress popup | Add a Popup to WordPress | keep |
| `/guides/shopify-popup.html` | Shopify | shopify popup | Add a Popup to Shopify | keep |
| `/guides/webflow-popup.html` | Webflow | webflow popup | Add a Popup to Webflow | keep |
| `/guides/collect-and-export-leads.html` | Leads/export | popup lead capture | Collect and export leads | keep |
| `/guides/popup-not-showing.html` | Troubleshooting | popup not showing | Popup not showing | keep |
| `/guides/popup-builder-for-ecommerce.html` | Ecommerce | ecommerce popup builder | Free Popup Builder for Ecommerce Stores | keep |
| `/guides/popup-builder-for-quick-commerce.html` | Quick commerce | quick commerce popup | Free Popup Builder for Quick Commerce | keep |
| `/guides/popup-builder-for-lead-generation.html` | Lead gen | lead generation popup | Free Lead Generation Popup Builder | keep |

No merge/delete candidates right now. The homepage owns "free popup builder"; do not create a second page for it.

## Proposed new pages (6 maximum)

| # | URL | Intent | Title (≤60) | Meta (≤155) | H1 |
|---|---|---|---|---|---|
| 1 | `/guides/squarespace-popup.html` | Platform install | Add a Popup to Squarespace \| PopupLoom | Install a PopupLoom popup on Squarespace with code injection or a code block, plus plan limits, testing and removal. | Add a PopupLoom popup to Squarespace |
| 2 | `/guides/wix-popup.html` | Platform install | Add a Popup to Wix \| PopupLoom | Install a PopupLoom popup on Wix where custom code is allowed, with iframe limits, testing and removal. | Add a PopupLoom popup to Wix |
| 3 | `/guides/carrd-popup.html` | Platform install | Add a Popup to Carrd \| PopupLoom | Add a PopupLoom popup to a Carrd site with an embed element, plus plan requirements, testing and removal. | Add a PopupLoom popup to Carrd |
| 4 | `/guides/static-html-popup.html` | Platform install | Add a Popup to a Static HTML Site \| PopupLoom | Install a PopupLoom popup on GitHub Pages, Netlify, Ghost or plain HTML with one snippet, then test and update it. | Add a popup to a static HTML site |
| 5 | `/exit-intent-popup.html` | Feature | Exit Intent Popup Builder \| PopupLoom | Create a desktop exit-intent popup free: choose a trigger, page rules, devices and frequency, then install one snippet. | Exit intent popup builder |
| 6 | `/email-signup-popup.html` | Feature | Email Signup Popup Builder \| PopupLoom | Build a free email signup popup with a visual editor, 45 templates, lead inbox and CSV export. No credit card. | Email signup popup builder |

### Required evidence per page
- Real instructions tested on the named platform or a correct limitation statement.
- One screenshot or exact code block from the shipped product.
- Honest limits: iframe restrictions, custom-code plan requirements, no cart access, no email/SMS sending.
- Links to `/guides/install-popups.html`, `/templates.html`, `/faq.html` and one relevant use-case page.

## Internal linking map

- New platform pages: link to and from the install guide; link to templates and FAQ.
- Feature pages: link to templates, install guide, ecommerce and lead-gen playbooks.
- Guides hub: add every new page.
- Homepage: add a "Popup types" block linking only to the two feature pages once published.
- Never link from private pages, reset, verify or embed surfaces.

## Do not build

- A separate `/free-popup-builder` page (homepage owns it)
- An `/integrations` page (no native integrations exist)
- Ten feature pages (thin duplicates)
- Direct "Popupsmart vs PopupLoom" pages before brand demand
- A second "how to add a popup" post
- Auto-generated city/industry pages

## 90-day sequence

**Weeks 1–2 (done / in progress)**
- Security page corrected; ads policy-safe; CSP and app-script fixes deployed.
- Search Console baseline: impressions and queries for existing 19 URLs.
- Internal links from guides to templates, FAQ and studio.
- Finish Gridinsoft follow-up and directory listings.

**Weeks 3–6**
- Publish the four platform pages, one at a time.
- Add each to the guides hub and install guide.
- Request indexing after publish.

**Weeks 7–8**
- Publish the two feature pages.
- Add the homepage "Popup types" block.

**Weeks 9–12**
- One honest `/alternatives.html` page (no invented claims).
- Two long-tail posts: "popup builder without a WordPress plugin" and "popup builder for a plain HTML site".
- Review GSC: keep pages with impressions; merge or delete zero-impression pages after 8 weeks.

## Ads rule for new pages

Add a page to `shared/ad-pages.js` only when it has:
- 600+ words of original, useful content (or genuinely complete instructions)
- one intent, no duplicated page
- no private/account/transactional content

Keep one ad unit, the nonce CSP, and the Google CMP. Check the AdSense Policy center after each batch.

## Measurement

- GSC: impressions, clicks, average position per URL at 28 and 56 days.
- Do not judge a page before it is indexed and has 4 weeks of data.
- If a page has zero impressions after 8 weeks, merge or remove it rather than adding more.
