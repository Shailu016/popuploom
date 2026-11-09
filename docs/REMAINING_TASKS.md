# PopupLoom — remaining tasks (owner checklist)

Snapshot: **2026-11-09**. Everything below is either waiting on an account login, an outside reply, or a code change that was deliberately deferred. Nothing here is on fire.

Legend: `[ ]` = to do, `[x]` = already done, `(you)` = needs your account/password, `(me)` = code work I can do.

---

## 0. Already done (do not redo)

- [x] AdSense approved `popuploom.com` — status **Ready**, `ads.txt` **Authorized**
- [x] Ads live on 20 public content pages (1 unit per page), loader in `<head>`
- [x] Ads excluded on studio, profile, leads, reset-password, migration, API, 404, customer embeds
- [x] Google Privacy & messaging CMP — European message published
- [x] `ads.txt` correct: `google.com, pub-8947829712444522, DIRECT, f08c47fec0942fa0`
- [x] Search Console alert explained — private pages intentionally excluded, no penalty
- [x] `/guides/` 404 fixed; 19/19 sitemap URLs return 200 and are indexable
- [x] Email Routing live: `support@popuploom.com`, `security@popuploom.com`
- [x] SPF fixed, 13 CAA records, security.txt updated
- [x] Immutable embed `1.1.0` + SHA256 checksum
- [x] PBKDF2 600k / bcrypt 12 + rehash on login
- [x] Webhook SSRF + DNS-rebinding checks, revalidated per attempt
- [x] Lead PII removed from host `localStorage`
- [x] CI gates: `npm audit`, secret scan, Dependabot, daily monitor
- [x] Security docs: headers, embed, webhook, data flow, incident response, test results

---

## 1. Revenue and Google (do these first)

### 1.1 AdSense — confirm status and publish the US-states message `(you)` — 10 min
1. Open <https://adsense.google.com> → **Sites**. Confirm `popuploom.com` still says **Ready**.
2. **Policy center** → confirm there are **no violations**.
3. **Privacy & messaging → US state regulations** → the message `US states message - popuploom.com` is a **Draft**.
   - The old draft has a broken A/B experiment ("Original" variant empty), which is why publishing fails.
   - Recommended: delete that draft, click **Create message**, choose `popuploom.com`, keep the default opt-out link, then **Publish**.
   - Expected result: status changes from **Draft** to **Published**.
4. Leave the **European** message as it is (already active, 2 settings).

- [ ] popuploom.com still **Ready**
- [ ] Policy center shows no violations
- [ ] US-states message published

### 1.2 AdSense — earnings `(you)` — check after 48h
- New placements often show `unfilled` and **$0 for 24–48 hours** while Google crawls and validates traffic.
- Check **Home** and **Reports** after 48h. Do **not** click your own ads (account risk).

- [ ] Checked after 48h

### 1.3 Search Console — confirm the exclusion alert `(you)` — 5 min
1. Open <https://search.google.com/search-console> → property `popuploom.com`.
2. **Indexing → Pages**. The groups should only contain:
   - `noindex`: studio, profile, leads, reset-password, migration, demo
   - `robots.txt`: `/api/` and the same private pages
   - `Page with redirect`: `http→https`, `www→apex`, `/index.html→/`
3. **Do not remove those blocks.** They protect account and lead pages.
4. If the sitemap shows a warning, resubmit `https://popuploom.com/sitemap.xml`.

- [ ] Confirmed only private pages/redirects are listed
- [ ] Sitemap still shows 19 discovered, 0 errors

---

## 2. DNS, domain and email

### 2.1 DNSSEC — add the DS record at GoDaddy `(you)` — 5 min
Cloudflare already created the key; the registrar must publish it.

- Registrar: **GoDaddy.com, LLC**
- Domain: **popuploom.com**
- Go to GoDaddy → **My Products → Domains → popuploom.com → DNS → DNSSEC** (or Domain Settings → DNSSEC).
- Add this DS record exactly:

```
Key tag: 2371
Algorithm: 13 (ECDSAP256SHA256)
Digest type: 2 (SHA-256)
Digest: A7438705B2A374D8DE5A41097F4077B876D0C077E749BD745864BBA5D8A2E194
```

If GoDaddy asks for one line: `popuploom.com. 3600 IN DS 2371 13 2 A7438705B2A374D8DE5A41097F4077B876D0C077E749BD745864BBA5D8A2E194`

Verify afterwards:
- <https://dns.google/resolve?name=popuploom.com&type=DS> → should show one DS answer
- Cloudflare → DNS → Settings → DNSSEC → status should move from `pending` to `active`

Note: GoDaddy blocks automated browsers, so this must be done in your normal browser.

- [ ] DS record added
- [ ] DNSSEC active in Cloudflare

### 2.2 DMARC — point reports at a mailbox you read `(you)` — 10 min
Current record: `v=DMARC1; p=quarantine; adkim=r; aspf=r; rua=mailto:dmarc_rua@onsecureserver.net;`

- In Cloudflare → DNS → `_dmarc` TXT, change `rua` to `mailto:security@popuploom.com` (keep `p=quarantine`).
- Wait 7–10 days, review the reports (they arrive as XML attachments).
- If no legitimate mail fails, change to `p=reject`.

- [ ] `rua` changed to `security@popuploom.com`
- [ ] Reports reviewed
- [ ] `p=reject` applied (only after review)

---

## 3. Security code work (deliberately deferred)

### 3.1 Turnstile on lead submit `(me + you)` — 1–2 h
Widget exists in Cloudflare (`popuploom.com`, site key `0x4AAAAAAF3VgQoev5wPHZnG`), but it is **not wired** and the secret was exposed in chat, so it must be rotated before use.

- [ ] `(you)` Cloudflare → Turnstile → `popuploom.com` → **Rotate secret** → send me the new secret securely
- [ ] `(me)` wire site key + secret into Worker and Express, add token to the embed, update CSP
- [ ] `(me)` deploy a new immutable embed version so existing installs keep working

### 3.2 F-01 — stop keeping the login token in `localStorage` `(me)` — 1–2 days
The 30-day token is readable by any script on the page. Safer: `HttpOnly`, `Secure`, `SameSite` cookie with a dual-read migration window.

- [ ] Plan cookie session + dual-read
- [ ] Ship and verify existing sessions are not broken

### 3.3 F-06 — MFA, roles and session list `(me)` — 2–3 days
No second factor, no admin/normal roles, no "signed-in devices" list.

- [ ] Add TOTP 2FA
- [ ] Add session list + revoke-one/revoke-all
- [ ] Add role field (default `owner`)

### 3.4 F-08 — durable webhook delivery `(me)` — 1–2 days
Delivery runs in memory via `waitUntil`; a restart can lose one notification. Move to a D1 outbox + Cron consumer with retries and a dead-letter state.

- [ ] Outbox table + enqueue on lead
- [ ] Cron drain with exponential backoff
- [ ] Delivery-log status update

### 3.5 F-10 - alerting for the monitor `(me)` - 2 h
The daily monitor runs but nobody is paged when it fails.

- [x] Email path added in `scripts/monitor.cjs` (Resend)
- [x] GitHub issue fallback added in `.github/workflows/monitor.yml` (works without extra secrets)
- [ ] Optional: add `RESEND_API_KEY` and `ALERT_EMAIL_TO` as GitHub secrets so email alerts also fire
- [ ] Add a second check for the AdSense `Ready` status (manual for now)

### 3.6 F-15 - account enumeration `(me)` - done
Signup now sends a verification link and returns the same generic response whether or not the address is registered. Password login is blocked until the link is opened; password reset also verifies the address.

- [x] Generic registration response for new and existing addresses
- [x] Single-use verification token (hash stored, 24h expiry)
- [x] Login blocked until verified
- [x] Verification page `/verify-email.html`
- [x] Password reset marks the address verified
- [x] Google sign-in marks the address verified

### 3.7 F-16 - inflatable view counts `(me)` - 3 h
Repeated requests can inflate view numbers. Add per-visitor dedupe (hashed IP + widget + short window).

- [x] Dedupe view events in Worker (D1) and Express (in-memory)
- [x] Client-supplied visitor header is ignored
- [x] Keep rate limits

### 3.8 Independent security review `(you)` — later
Internal audit only; no outside pentest/ASVS. Do this before claiming "secure" publicly.

- [ ] Choose an assessor
- [ ] Provide scope + staging URL
- [ ] Fix findings

---

## 4. Visibility and directories

Each of these needs an account, and most need identity/domain verification (you).

| Directory | URL | What is needed | Status |
|---|---|---|---|
| Product Hunt | <https://www.producthunt.com/> | account + launch | not listed |
| AlternativeTo | <https://alternativeto.net/> | Google login | not listed |
| SaaSHub | <https://www.saashub.com/> | account | not listed |
| G2 | <https://www.g2.com/> | vendor account + verification | not listed |
| Capterra / GetApp | <https://www.capterra.com/> | vendor account | not listed |
| Crunchbase | <https://www.crunchbase.com/> | account | not listed |

Use approved copy from `/press.html`; do not invent awards or user counts.

- [ ] Product Hunt
- [ ] AlternativeTo
- [ ] SaaSHub
- [ ] G2
- [ ] Capterra / GetApp
- [ ] Crunchbase

---

## 5. Reputation cleanup

- [x] Requests sent 2026-11-07 to `support@urlscan.io`, `contact@socradar.io`, `legal@gridinsoft.com`
- [ ] Follow up once if no reply after 7–10 business days (from 2026-11-07 → around 2026-11-17)
- [ ] Check Gridinsoft verdict again: <https://www.gridinsoft.com/site/popuploom.com>
- [ ] Do **not** send repeated removal requests

- [ ] Reply received / flag cleared

---

## 6. Ads QA and policy hygiene

### 6.1 Thin pages with ads - done (2026-11-09)
Ads were removed from `/demo.html`, `/contact.html`, `/terms.html` and `/privacy.html`. `/about.html` (~226 words) and `/guides/index.html` (~344 words) keep ads as normal content pages.

- [x] Decision made and applied in `shared/ad-pages.js`
- [x] Deployed; live check confirms the four pages are ad-free

### 6.2 Lighthouse after ads - measured
Ads now load on the homepage.

- [x] Lighthouse mobile: accessibility 100, SEO 100
- [x] Performance 62–92 (run variance), LCP 2.9–3.9s, CLS 0
- [x] Best practices 79 - AdSense third-party cookies, expected for an ad-funded site
- [x] Fixed ad-page script blocking (`strict-dynamic` + nonce on page scripts)
- [x] Fixed the blocked Google CMP beacon in `connect-src`/`frame-src`
- [ ] Optional: inline critical CSS or trim font weights to improve mobile LCP

---

## 7. Optional product/SEO follow-ups

- [ ] Request indexing in Search Console for the 3 new use-case guides (if not already indexed)
- [ ] Run `npm run indexnow` after the next content change
- [ ] Add real directory profile URLs to `Organization.sameAs` once they exist
- [ ] Consider adding ads to (or excluding) the legal pages based on the 6.1 decision
- [ ] `csvpilot.in` in the same AdSense account is still **Getting ready** — separate site, only relevant if you plan to monetize it

---

## 8. Quick verification commands

Run from the repo root:

```powershell
# DNSSEC DS (expect one answer)
curl.exe -s "https://dns.google/resolve?name=popuploom.com&type=DS"

# DMARC
curl.exe -s "https://dns.google/resolve?name=_dmarc.popuploom.com&type=TXT"

# ads.txt
curl.exe -s https://popuploom.com/ads.txt

# ads present on a guide, absent on account pages
curl.exe -s https://popuploom.com/guides/install-popups.html | Select-String "data-pl-ad"
curl.exe -s https://popuploom.com/profile.html | Select-String "adsbygoogle"
```

Expected: one DS answer, the DMARC record, the ads.txt line, `data-pl-ad` on guides and **nothing** on profile.

---

## 9. Order I recommend

1. DNSSEC DS (5 min, finishes hardening)
2. AdSense US-states message + Policy Center check (10 min)
3. DMARC `rua` change (10 min)
4. Thin-page/ad decision (5 min)
5. Directory listings (1–2 h total)
6. Security code items in this order: Turnstile → F-08 → F-01 → F-06 → F-15 → F-16
7. Pentest last, once the above is stable
