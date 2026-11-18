# PopupLoom outreach and webmaster checklist

> **Historical internal record — not public copy.** Names of other products appear
> when describing directory or outreach context. They are out of scope for the
> no-names rule in `AGENTS.md`, which governs public pages and shipped copy.

**Created:** 2026-11-14
**Purpose:** the owner-only half of the SEO plan: Bing Webmaster, directories,
communities and link outreach. Nothing here requires a paid link or a fake claim.

---

## 1. Bing Webmaster Tools

Google is not the only index. Bing powers Copilot and several search surfaces.

1. Open <https://www.bing.com/webmasters>.
2. Sign in with the account that should own the property.
3. Prefer **Import from Google Search Console** if offered; otherwise add
   `https://popuploom.com` and verify with DNS.
4. Submit `https://popuploom.com/sitemap.xml`.
5. Use **URL Submission** for the money page and the alternatives after launch.
6. Check **Site Scan** for crawl or security warnings.
7. Re-check **Index Explorer** in 7 days.

IndexNow is already implemented and has been run after each deploy (45 URLs,
HTTP 200). That covers Bing and its partners even before the Webmaster account is
verified; the account adds reporting and manual submission.

**Status 2026-11-14:** `popuploom.com` is active in Bing Webmaster. The sitemap
reports Success with 45 URLs discovered, URL Submission accepted all 45 URLs, and
the IndexNow report lists them with source “Self”. The only Site Scan error bucket
is “Blocked by robots.txt”, which is expected for the private app surfaces.

**Owner action:** keep the account signed in for weekly reports. Do not create a
second Google identity.

---

## 2. Directory and listing targets

Mark each as done only after the listing is live and links to
`https://popuploom.com/`.

| Target | URL | Account needed | Notes |
|---|---|---|---|
| WordPress.org plugin | https://wordpress.org/plugins/ | Existing | "PopupLoom Popup Builder Embeds" 1.0.2 is back in review after the pre-review reply. Do not resubmit again while the thread is open. |
| GitHub embed repo | https://github.com/Shailu016/popuploom-embed | Existing | README links to the site; keep the MIT license and tests. |
| GitHub main repo | https://github.com/Shailu016/popuploom | Existing | Product README, install docs and security notes. |
| Product Hunt | https://www.producthunt.com/ | Owner | Launch only after the 45-page inventory and onboarding are stable. Use the press kit facts. |
| AlternativeTo | https://alternativeto.net/ | Owner | List as a free alternative to OptinMonster/Poptin/Popupsmart. Use factual limits. |
| SaaSHub | https://www.saashub.com/ | Owner | Same positioning; link the comparison pages. |
| Slant | https://www.slant.co/ | Owner | Add to relevant “best popup builder” questions; disclose affiliation. |
| G2 | https://www.g2.com/ | Owner | Only if eligible. Never invent reviews or ratings. |
| Capterra / GetApp | https://www.capterra.com/ | Owner | Same rule: real reviews only. |
| Peerlist | https://peerlist.io/ | Owner | Launch/listing post with the no-limits angle. |
| Uneed | https://www.uneed.best/ | Owner | Indie tool directory. |
| Microlaunch | https://microlaunch.net/ | Owner | Launch post. |
| Indie Hackers | https://www.indiehackers.com/ | Owner | Share the build story, not a drive-by link. |
| Hacker News (Show HN) | https://news.ycombinator.com/showhn.html | Owner | Only with a genuinely interesting technical angle (CSP, embed runtime, no pageview meter). |
| Reddit | Relevant subs | Owner | Read each sub’s self-promotion rules first. Disclose affiliation. |

Do **not** buy links, use PBNs, mass-post the same text, or create fake reviews.
Those are the fastest way to lose the AdSense account and the domain’s trust.

---

## 3. Outreach targets (factual update pitch)

These are sites that already publish popup comparisons or platform tutorials.
Pitch a correction or an addition, not a paid placement.

1. “Best free popup builder” listicles that omit PopupLoom or list stale limits.
2. WordPress tutorial sites covering “popup without a plugin”.
3. Shopify/Webflow/Squarespace/Wix tutorial sites.
4. Marketing tool directories that compare OptinMonster, Poptin or Popupsmart.
5. Newsletters and communities covering indie marketing tools.

### Email template

Subject: `Factual update: free popup builder limits (checked 14 Nov 2026)`

> Hi {name},
>
> I’m the maintainer of PopupLoom, a free popup builder with no pageview or
> visitor cap. I noticed {page} lists free popup tools and may have an outdated
> limit.
>
> I checked the vendors’ own pricing pages on 14 November 2026:
> OptinMonster free trial 500 campaign impressions; Poptin free 1,000 unique
> visitors/month; Popupsmart free 5K pageviews/month; OptiMonk free 10,000
> pageviews/month; Popup Maker free WordPress plugin with unlimited impressions.
>
> If it is useful, here is the dated comparison with source links:
> https://popuploom.com/best-free-popup-builder.html
>
> No payment or affiliate arrangement is requested. If the page is accurate as
> written, no change is needed.
>
> {your name}
> PopupLoom

Keep it short. Never claim a ranking, review score, customer count or security
certification. If someone asks for payment, decline and record it.

---

## 4. Product Hunt launch checklist

Only launch when these are true:

- [ ] The homepage and money page load cleanly on mobile.
- [ ] A new user can save a popup and copy the install code without help.
- [ ] The lead inbox and CSV export work.
- [ ] The 10 template category pages and the first individual template guides are live.
- [ ] Ads are absent from the app and onboarding flow.
- [ ] The press kit facts are current (no stale numbers).
- [ ] A support inbox is monitored on launch day.
- [ ] The launch post says what PopupLoom does **not** do.

Suggested one-line description: “Free popup builder with no pageview limits,
53 templates and a two-line install.”

---

## 5. UTM convention

Use one convention so Cloudflare Analytics and D1 signups can be compared:

```
?utm_source=producthunt&utm_medium=launch&utm_campaign=ph_2026_11
?utm_source=alternativeTo&utm_medium=directory&utm_campaign=listings_2026_11
?utm_source=newsletter_name&utm_medium=email&utm_campaign=outreach_2026_11
```

Do not put UTM parameters on internal links; use them only on external campaigns.

---

## 6. Weekly cadence

| Day | Task |
|---|---|
| Monday | Check GSC indexing, clicks and queries; export CSVs to `seo/`; run `npm run seo:scorecard`. |
| Tuesday | Publish or refresh one page; add 3–5 internal links. |
| Wednesday | Send 5 factual outreach emails; log replies. |
| Thursday | Check Bing Webmaster and IndexNow; fix crawl or CWV issues. |
| Friday | Review signups, widgets saved, first views and first leads; write one learning. |

---

## 7. Guardrails

- No fabricated certifications, audits, review counts, customer logos or
  conversion lift.
- Competitor limits must be dated and source-linked.
- No ads on private/app/legal/contact/terms/demo pages.
- No new ad pages without a content review and an explicit allowlist change.
- No paid links or link schemes.
- No mass AI content; every page needs a real example, screenshot or decision.
- Disclose affiliation in every community post.
