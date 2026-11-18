# PopupLoom Security Remediation

Updated: 2026-11-07
Baseline: `SECURITY_AUDIT.md` (2026-11-06)
Deployed commit: `1cad808` (plus DNS changes made directly in Cloudflare)

This document records what was actually changed, what was tested, and what remains. It does not claim that the full audit plan is complete.

---

## 1. Status summary

| ID | Finding | Severity | Status |
| --- | --- | --- | --- |
| F-01 | 30-day bearer token in `localStorage` | High | **Open** — session migration not started |
| F-02 | Mutable, unversioned embed runtime | High | **Fixed** — immutable `/embed/1.1.0/` release with published SHA-256 |
| F-03 | Webhook SSRF via DNS names | High | **Fixed in code** — DNS resolution + private-address rejection before save and before each delivery |
| F-04 | Lead PII in host-page `localStorage` | Medium | **Fixed** — runtime no longer writes `pfsubs.*`; legacy keys removed on load |
| F-05 | Public lead endpoint abuse | Medium | **Open** — rate limits remain; no Turnstile/WAF/quota yet |
| F-06 | No MFA/admin roles/session management | Medium | **Open** |
| F-07 | Password hashing below guidance | Medium | **Fixed** — PBKDF2 600k, bcrypt 12, rehash on login |
| F-08 | Webhook delivery not durable | Medium | **Open** — still `waitUntil` + 3 in-memory attempts |
| F-09 | Retention/deletion gaps | Medium | **Improved** — explicit deletion of submissions/webhooks/reset tokens; retention documented; no scheduled TTL |
| F-10 | No monitoring/incident response | Medium | **Partial** — incident runbook, daily monitor, email + GitHub issue alerts; no on-call rotation |
| F-11 | CI security gates missing | Medium | **Fixed in repo** — npm audit, secret scan, Dependabot, production environment |
| F-12 | Trust surface incomplete | Medium | **Fixed** — `/security.html`, security.txt policy, footer links, `security@` and `support@` routed to a verified mailbox |
| F-13 | Email/DNS hardening | Medium | **Partial** — apex SPF `include:_spf.mx.cloudflare.net ~all`, CAA added; DNSSEC and DMARC reject pending |
| F-14 | Header/runtime consistency | Low | **Partial** — Express CSP list updated; HSTS/COOP/CORP unchanged |
| F-15 | Email enumeration on registration | Low | **Fixed** — generic signup response plus email verification before the first sign-in |
| F-16 | Inflatable view counts | Low | **Fixed** — hourly dedupe per widget/IP in Worker and Express |
| R-01 | Gridinsoft phishing false positive | High (business) | **Partial** - Gridinsoft removed its Phishing detection on 2026-11-10 (report now Inconclusive, 53/100); Norton dispute submitted; SOCRadar warning remains |

---

## 2. Changes shipped in `1cad808`

### 2.1 Webhook SSRF (F-03)

`shared/webhook.js`

- Added `privateAddress()` for IPv4 and IPv6 loopback, private, link-local, multicast, documentation and reserved ranges.
- Added `validateUrlResolved()`:
  - validates the URL shape first;
  - resolves the hostname through an injected resolver;
  - rejects any resolved private/reserved address;
  - fails closed when DNS fails.
- Added `dohResolve()` for the Worker (DNS-over-HTTPS).
- `deliver()` now revalidates the destination immediately before each attempt.
- Express uses `node:dns` with `{ all: true, verbatim: true }`.
- The Worker uses Cloudflare DNS-over-HTTPS.
- Local development can still use `ALLOW_INSECURE_WEBHOOKS=true` and loopback for tests.

Regression test added:

```text
webhook DNS validation blocks hostnames that resolve to private addresses
```

It covers `127.0.0.1.nip.io`, `169.254.169.254.nip.io`, `10.0.0.1.sslip.io`, `localtest.me`, a public address, DNS failure, and a delivery that must not call `fetch`.

Residual risk: DNS rebinding between our lookup and the platform's own lookup is reduced but not fully eliminated. A future egress proxy or pinned-IP connector would close it completely.

### 2.2 Lead PII in browser storage (F-04)

`popuploom.js`

- Removed the `pfsubs.<widget>` write that duplicated every successful lead in the customer site's `localStorage`.
- Added `clearLegacyLeadCache()` at boot, which removes existing `pfsubs.*` keys.
- The server inbox remains the source of truth.

`privacy.html`

- Updated the browser-storage section to state that submitted responses are not written to browser storage and that legacy `pfsubs.*` entries are removed.

### 2.3 Password hashing (F-07)

- Worker: `PBKDF2_ITERATIONS` raised from 100,000 to 600,000.
- Express: bcrypt cost raised from 10 to 12.
- Successful login rehashes:
  - legacy bcrypt hashes to the current bcrypt cost;
  - PBKDF2 hashes below 600,000 to the current work factor.
- Google-only dummy hashes and random unusable hashes use the current cost.

### 2.4 Versioned embed runtime (F-02)

- Build creates `embed/<version>/popuploom.js` and `SHA256SUMS` for each published release.
- The new install snippet points to `/embed/1.1.0/popuploom.js`.
- The versioned path is served with `Cache-Control: public, max-age=31536000, immutable`.
- `/popuploom.js` remains a mutable alias of the current release.
- `Runtime.version` is now `1.1.0`.
- The Express runtime serves the same bytes from the canonical source file and generates the same checksum.
- Live checksum verified: `633468cef2cb8837dce749d0c9673d74b23f6dae299037998436304a3129d017`.

### 2.5 Explicit deletion (F-09)

- Widget deletion now explicitly removes submissions, webhook deliveries and webhook endpoints.
- Account deletion now explicitly removes the account's submissions, webhook deliveries, webhook endpoints, widgets, reset tokens, then the user.
- This no longer relies solely on foreign-key cascades.
- Regression test now creates a real submission and asserts it is gone after account deletion.

### 2.6 Trust page and headers (F-12, F-14)

- Added `security.html` with:
  - reporting channel and response targets;
  - in-scope/out-of-scope rules;
  - safe testing rules;
  - account, popup, lead, webhook and infrastructure protections;
  - incident response summary;
  - explicit “what this page does not claim”.
- Linked from the homepage, About, Contact, Privacy, Terms, FAQ, Press kit and Guides hub.
- `security.txt` now points `Policy` to `/security.html`.
- Added `security.html` to sitemap, build, Worker/Express allowlists, CSP hashes and regression tests.
- Express `htmlFiles` now includes every current public page.

### 2.7 Reputation presentation (R-01)

- Studio previews now show a high-contrast banner: **“Demo preview — not a live offer”**.
- Homepage migration link now points to `https://popuploom.com/migration.html` instead of the `workers.dev` host.
- Evidence is preserved in `SECURITY_AUDIT.md`; no reclassification request has been sent yet.

### 2.8 CI and dependency policy (F-11)

- Workflow adds:
  - `npm audit --omit=dev --audit-level=high`;
  - `npm run security:scan` (tracked-file credential patterns);
  - `environment: production` on the deploy job.
- Added `.github/dependabot.yml` for weekly npm and GitHub Actions updates.
- Added `scripts/secret-scan.cjs`.

### 2.9 DNS changes (F-13)

Applied directly in Cloudflare DNS on 2026-11-06/07:

- Apex SPF: initially `v=spf1 -all`; after enabling Cloudflare Email Routing it is `v=spf1 include:_spf.mx.cloudflare.net ~all` (one SPF record only). Resend continues to use the separate `send.popuploom.com` SPF and apex DKIM.
- CAA:
  - `issue`: `pki.goog`, `letsencrypt.org`, `digicert.com`, `sectigo.com` (existing `comodoca.com` and `ssl.com` also present);
  - `issuewild`: same set;
  - `iodef`: `mailto:security@popuploom.com`.
- Existing Resend DKIM and send-subdomain SPF remain.
- DMARC remains `p=quarantine` with aggregate reports.
- Cloudflare Email Routing enabled with MX records and two forwarding rules:
  - `security@popuploom.com` → verified destination;
  - `support@popuploom.com` → verified destination.
- Apex DKIM `cf2024-1._domainkey.popuploom.com` added by Email Routing.

---

## 3. Test results

Run after the changes:

| Suite | Result |
| --- | --- |
| `npm test` | **52 passed, 0 failed** |
| `npm run test:cf` | **14 passed, 0 failed** |
| `npm run test:cf:integration` | **116 passed, 0 failed** |
| `npm run security:scan` | no credential-shaped strings |
| `npm audit` | 0 vulnerabilities |
| GitHub Actions deploy `42271385281` | success |
| Live `/security.html` Lighthouse | Accessibility 100, Best Practices 100, SEO 100 |
| Live embed checksum | matches `SHA256SUMS` |
| Live `security.txt` policy | points to `/security.html` |
| Live homepage | no `workers.dev` migration link; no ad script |
| Email Routing | status `ready`; destination verified; `security@` and `support@` rules enabled |
| Daily monitor | `node scripts/monitor.cjs` passed (health, headers, embed hash, DNS) |

---

## 4. Remaining work

### High

1. **F-01 session migration** — HttpOnly cookies, CSRF tokens, session list and revoke-all. This is the largest remaining auth change and needs a dual-read migration so current users are not signed out.
2. **R-01 reclassification** — after the trust changes are live, contact URLScan, SOCRadar and Gridinsoft with evidence. Do not claim resolution until a provider changes its verdict.

### Medium

3. **F-05** — add Turnstile/WAF/per-widget quotas and abuse alerts. Requires account configuration and a site key; do not invent one.
4. **F-06** — optional TOTP, recovery codes, roles and audit logs.
5. **F-08** — durable webhook outbox/queue with dead-letter and replay. Cloudflare Queues or a D1 outbox + scheduled Worker.
6. **F-09** — scheduled retention cleanup and a tested D1 restore.
7. **F-10** — uptime/error monitoring, CSP reporting, script-hash monitoring, DNS/TLS expiry checks, incident register.
8. **F-12** — activate `security@popuploom.com` and `support@popuploom.com` (Email Routing destination exists but rules are not active) and update the contact page.
9. **F-13** — DNSSEC and DMARC `p=reject` after monitoring. DNSSEC requires a DS record at the registrar.

### Low

10. **F-15** — generic registration response plus verification email.
11. **F-16** — deduplicate or label view counts.
12. **F-14** — HSTS `includeSubDomains`, COOP/CORP, tighter `img-src`.

---

## 5. Rollback

- F-03: revert `shared/webhook.js` and the route option changes; keep database state.
- F-04: no data migration needed; old keys are already removed on next load.
- F-07: old hashes remain verifiable; reverting only changes new hashes and rehash-on-login.
- F-02: current `/popuploom.js` alias remains; customers on the versioned path keep working. To roll back a bad release, publish a new version and change the snippet; do not overwrite the old path.
- F-09: deletion is irreversible; test on a staging database first.
- DNS: remove the added SPF/CAA records in Cloudflare if they break issuance or mail; keep the existing Resend records.

---

## 6. What is still not claimed

- No independent penetration test has been completed.
- No ISO 27001, SOC 2 or PCI DSS certification is claimed.
- No guarantee that Gridinsoft, SOCRadar or any other provider will change its classification.
- No guarantee of uptime, delivery, recovery time or response time.
- The audit report’s limitations still apply.
