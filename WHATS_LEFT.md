# What is left to do

Updated: **2026-11-09**. Only outstanding items. Done work is not repeated here.
Status today: site live, AdSense approved and ads serving, Search Console clean, 19/19 sitemap URLs indexable.

Who: **YOU** = needs your account/password. **ME** = code work I can ship.

---

## Priority 1 — 20 minutes, do these first

### 1. DNSSEC DS record at GoDaddy — YOU (5 min)
Cloudflare created the key; the registrar has not published it, so DNSSEC is stuck on `pending`.

1. GoDaddy → My Products → Domains → **popuploom.com** → DNS → **DNSSEC**
2. Add:

```
Key tag:     2371
Algorithm:   13 (ECDSAP256SHA256)
Digest type: 2 (SHA-256)
Digest:      A7438705B2A374D8DE5A41097F4077B876D0C077E749BD745864BBA5D8A2E194
```

3. Verify: <https://dns.google/resolve?name=popuploom.com&type=DS> shows one answer, and Cloudflare DNSSEC turns **active**.

- [ ] DS added
- [ ] DNSSEC active

### 2. AdSense US-states consent message — YOU (5 min)
EU message is live. US-state opt-out message is still a **Draft** and the old draft is broken.

1. AdSense → **Privacy & messaging** → **US state regulations**
2. Delete `US states message - popuploom.com` (A/B experiment with an empty "Original" variant)
3. **Create message** → select popuploom.com → keep default opt-out link → **Publish**

Also while there: **Policy center** = no violations; **Sites** = popuploom.com still **Ready**.

- [ ] US-states message published
- [ ] Policy center clean
- [ ] Site still Ready

### 3. DMARC reports to a mailbox you read — YOU (5 min)
Current: `v=DMARC1; p=quarantine; adkim=r; aspf=r; rua=mailto:dmarc_rua@onsecureserver.net;`

1. Cloudflare → DNS → `_dmarc` TXT
2. Change **only** `rua` to `mailto:security@popuploom.com`
3. After 7–10 days of reports show no legitimate failures, change `p=quarantine` to `p=reject`

- [ ] `rua` updated
- [ ] Reports reviewed
- [ ] `p=reject` applied

---

## Priority 2 — decide on ad coverage (YOU, 2 min)

Ads currently run on 20 pages, including some thin/legal pages:

| Page | ~words | Risk |
|---|---|---|
| `/contact.html` | 150 | thin |
| `/about.html` | 226 | short |
| `/demo.html` | 175 | `noindex`, mock storefront |
| `/terms.html` | 437 | legal |
| `/privacy.html` | 634 | legal |
| `/guides/index.html` | 344 | hub |

Recommendation: keep homepage, templates, FAQ, press, security, guides; remove ads from demo, contact, terms and privacy.
Reply "exclude demo/contact/terms/privacy" and I'll change `shared/ad-pages.js`.

- [ ] Decision made

---

## Priority 3 — traffic and reputation (YOU)

### Directories (1–2 h total)
Use the copy on `/press.html`; do not invent awards or user counts.

- [ ] Product Hunt — <https://www.producthunt.com/>
- [ ] AlternativeTo — <https://alternativeto.net/>
- [ ] SaaSHub — <https://www.saashub.com/>
- [ ] G2 — <https://www.g2.com/>
- [ ] Capterra / GetApp — <https://www.capterra.com/>
- [ ] Crunchbase — <https://www.crunchbase.com/>

### Reputation
- [x] Removal requests sent 2026-11-07 (URLScan, SOCRadar, Gridinsoft)
- [ ] Follow up once around **2026-11-17** if no reply
- [ ] Recheck <https://www.gridinsoft.com/site/popuploom.com>
- [ ] Do not send repeated requests

---

## Priority 4 — security code work (ME)

These are known findings from `SECURITY_AUDIT.md`. Each is a separate, testable change.

| Item | What it fixes | Effort |
|---|---|---|
| Turnstile | Bots can spam lead forms. Widget exists; secret must be rotated, then wired into Worker/Express/embed on a new embed version. | 1–2 h |
| F-08 | Webhook delivery can be lost on restart. Move to a D1 outbox + Cron retries. | 1–2 days |
| F-01 | 30-day login token in `localStorage` can be stolen by any script. Move to `HttpOnly` cookie with dual-read. | 1–2 days |
| F-06 | No MFA, roles or session list. Add TOTP, roles, revoke sessions. | 2–3 days |
| F-15 | Signup/login can reveal whether an email exists. Make responses generic. | 2 h |
| F-16 | View counts can be inflated. Dedupe per visitor in a short window. | 3 h |
| F-10 | Monitor runs but nobody is paged on failure. Send alert email. | 2 h |

- [ ] Turnstile
- [ ] F-08 durable webhooks
- [ ] F-01 cookie sessions
- [ ] F-06 MFA + sessions
- [ ] F-15 enumeration
- [ ] F-16 view counts
- [ ] F-10 alerting

---

## Priority 5 — before claiming "secure" (YOU)

- [ ] Independent pentest / ASVS review (internal audit exists; no outside test yet)
- [ ] Fix findings, re-test

---

## Priority 6 — ads QA (ME, 15 min)

- [ ] Lighthouse desktop + mobile on `/` now that ads load there
- [ ] If LCP/CLS regressed, reserve fixed height for the ad slot

---

## Waiting on other people (no action for you)

- Gridinsoft / URLScan / SOCRadar replies
- AdSense earnings appear 24–48h after serving starts; `unfilled` right now is normal

---

## Copy-paste verification

```powershell
curl.exe -s "https://dns.google/resolve?name=popuploom.com&type=DS"
curl.exe -s "https://dns.google/resolve?name=_dmarc.popuploom.com&type=TXT"
curl.exe -s https://popuploom.com/ads.txt
curl.exe -s https://popuploom.com/guides/install-popups.html | Select-String "data-pl-ad"
curl.exe -s https://popuploom.com/profile.html | Select-String "adsbygoogle"
```

Expected: one DS answer, DMARC record, ads.txt line, `data-pl-ad` on guides and nothing on profile.
