# PopupLoom Security Audit

**Scope:** repository, Express runtime, Cloudflare Worker, D1/SQLite schema, browser application, embed runtime, webhook pipeline, domain/DNS/email posture and public reputation signals.
**Assessment date:** 2026-11-06
**Method:** read-only source review, existing test suites, live header/DNS/RDAP checks, public reputation sources.
**Status:** Phase 1 audit complete. No application code changed. This is not a penetration test and does not claim ASVS certification.

---

## 1. Executive summary

No **Critical** vulnerability was confirmed. No remote code execution, SQL injection, authentication bypass or cross-tenant data access was found in the reviewed code. The existing test suites are unusually strong for a project of this size and already cover object-level authorization, hostile popup configs, CSV formula injection, webhook signing, reset-token replay and CSP behaviour.

The material risks are:

1. **Embedded-runtime supply chain** — customers install a mutable script from `popuploom.com`. A compromise of that origin or deployment would execute attacker code on every customer site. The runtime is not version-pinned, has no published integrity hash and has no customer-facing rollback path.
2. **Session storage** — a 30-day bearer token is kept in `localStorage`. Any same-origin XSS or third-party script compromise can steal a long-lived session. No current XSS was found, so this is defence-in-depth rather than an active exploit.
3. **Webhook SSRF** — the private-address filter checks literal IPs but not DNS names that resolve to private/loopback addresses. `https://127.0.0.1.nip.io/hook`, `https://169.254.169.254.nip.io/...` and `https://10.0.0.1.sslip.io/hook` are accepted by `validateUrl`. This is exploitable on the Express runtime; Cloudflare Workers reduce but do not remove the design risk.
4. **Reputation false positive** — the Gridinsoft phishing label is driven by one external provider (SOCRadar), a five-day-old domain and generic heuristics. Public URLScan records show eight studio-template scans tagged `possiblethreat,phishing` by a single submitter, including `tpl=blank`; URLScan itself has no verdict or label. Google Search Console reports **no security issues and no manual actions**.
5. **Trust surface** — no `/security` page, no domain-based security/support address, no published retention schedule, no changelog or status page, and the homepage still links the migration page on a `workers.dev` subdomain.
6. **Operational security** — no MFA, no admin roles, no durable webhook queue, no security monitoring/alerting, no tested backup restore and no dependency/secret/SAST gates in CI.

**Risk counts:** Critical 0 · High 4 · Medium 9 · Low 3 · Informational strengths.

The correct order is: fix the High items and trust gaps, then request reclassification from URLScan/SOCRadar/Gridinsoft with evidence. Do not submit repeated removal requests before the fixes are live.

### Remediation status (2026-11-07)

| Finding | Status |
| --- | --- |
| F-02 mutable embed | **Fixed** — immutable `/embed/1.1.0/` plus SHA-256 |
| F-03 webhook SSRF | **Fixed in code** — DNS resolution and private-address rejection |
| F-04 lead PII in host storage | **Fixed** — runtime no longer writes `pfsubs.*`; legacy keys cleared |
| F-07 password hashing | **Fixed** — PBKDF2 600k, bcrypt 12, rehash on login |
| F-09 deletion/retention | **Improved** — explicit deletion, retention documented; no scheduled TTL |
| F-11 CI gates | **Fixed in repo** — audit, secret scan, Dependabot, production environment |
| F-10 monitoring | **Partial** — daily production monitor added; no paging/on-call |
| F-12 trust page | **Fixed** — `/security.html` live; `security@`/`support@` routed to a verified mailbox |
| F-13 email/DNS | **Partial** — SPF, DKIM, MX, Email Routing and CAA added; DNSSEC and DMARC reject pending |
| R-01 reputation | **Evidence gathered** — reclassification not yet requested |
| F-01, F-05, F-06, F-08, F-10 | **Open** |

See `SECURITY_REMEDIATION.md` for exact changes, tests and rollback. DNS values in Section 5/F-13 were captured before the remediation; the current apex SPF is `v=spf1 -all` and CAA records now exist.

---

## 2. Architecture observed

| Layer | Implementation |
| --- | --- |
| Frontend | Static HTML/CSS and vanilla JavaScript; no SPA framework or bundler |
| Primary runtime | Cloudflare Worker (`worker/index.js`) with static assets and D1 |
| Secondary runtime | Express (`server/index.js`) with SQLite, used for local/alternate deployment |
| Database | D1 in production, SQLite locally; users, widgets, submissions, revoked tokens, reset tokens, rate limits, webhook endpoints, webhook deliveries |
| Authentication | Email/password plus Google Identity Services; HS256 JWT, 30-day expiry; token versioning; server-side revocation |
| Password hashing | PBKDF2-SHA256 100,000 iterations on Worker; bcrypt cost 10 on Express; legacy bcrypt upgraded on login |
| Embed | `popuploom.js` fetches public widget config, renders DOM on the host page, records views/submissions, optional browser webhook |
| Server webhooks | HMAC-SHA256 signed POST, three in-process attempts, manual redirect handling, delivery log |
| Email | Resend API for password reset; raw token only in the emailed URL fragment |
| Hosting | Cloudflare Workers, D1, Cloudflare DNS/CDN; GitHub Actions deploy on push to `main` |
| Ads | Fail-closed AdSense integration; disabled in production |

The two runtimes share auth, validation, reset, webhook and host-policy modules. That is good for consistency, but it means a fix must be applied in both places and tests must cover both.

---

## 3. What is already strong

These are confirmed observations, not assumptions:

- **Prepared statements** are used for all database access reviewed. No string-concatenated user input reached SQL.
- **Object-level authorization** is applied to widget reads, updates, deletes, submissions, webhook settings and delivery logs. Cross-account access returns 404.
- **Widget IDs** are 96-bit server-generated values; client-supplied IDs are overwritten.
- **Password reset** stores only a SHA-256 token hash, uses a 30-minute single-use token, uses a conditional atomic consume, and revokes sessions through `token_version`.
- **Authentication responses** are generic for login and forgot-password; unknown accounts still perform a dummy hash check to reduce timing leaks.
- **JWT signing secrets** are validated for length and known placeholders; production requires a configured secret.
- **Logout** revokes the current token server-side; token versioning invalidates all sessions after a password change.
- **Rate limits** are atomic and keyed by a SHA-256 hash of the client address; a test covers spoofed forwarded-IP headers.
- **CORS** rejects non-allowlisted browser origins on private APIs while keeping public widget config/view/submit endpoints cross-origin.
- **CSP** is hash-based for inline scripts, has no `unsafe-eval`, denies framing, disables object embedding, restricts `base-uri` and `form-action`, and permits only named Google/YouTube/Vimeo sources.
- **Output escaping** in the embed and studio covers text, attributes, URLs, colours, class names and field types. Tests inject hostile placement, theme, button URL and field values.
- **Media URLs** are restricted to HTTPS YouTube/Vimeo; iframes are sandboxed and cannot navigate the top-level page.
- **Webhook signing** uses HMAC-SHA256 over `timestamp.body`, supports secret rotation, retries transient failures, does not follow redirects and does not read response bodies.
- **CSV export** prefixes formula-leading cells, escapes quotes and preserves Unicode; a test covers `=HYPERLINK`, `+CMD` and multiline data.
- **Static serving** uses an explicit allowlist; encoded separators, lookalike verification files and unknown paths return hardened 404s.
- **Secrets** are not tracked in Git. `.env` and `private-data/` are ignored; `npm audit` reports 0 known vulnerabilities.
- **CI** pins action commit SHAs, disables persisted Git credentials and uses read-only repository permissions.
- **Google Search Console** reports no security issues and no manual actions for `sc-domain:popuploom.com` as of 2026-11-06.

Existing test evidence at audit time:

- `npm test`: **49 passed, 0 failed**
- `npm run test:cf`: **13 passed, 0 failed**
- `npm run test:cf:integration`: **116 passed, 0 failed**
- `npm audit`: **0 vulnerabilities**

---

## 4. Findings

### F-01 — Long-lived bearer token stored in `localStorage` — **High**

**Location:** `app.js:28-36`, `worker/auth.js:8`, `server/auth.js:18`, `profile.html` session UI.

**Evidence:** `getToken`, `setToken` and `clearToken` use `localStorage`; the JWT lifetime is `30d`. The token is attached as `Authorization: Bearer ...` by JavaScript.

**Impact:** Any same-origin XSS, malicious browser extension with page access, or compromise of an allowed third-party script can read a 30-day credential and impersonate the user. `HttpOnly` cookies would prevent JavaScript from reading the session. No working XSS was found, so this is not an active exploit; it is a high-impact containment gap.

**Recommendation:** Move browser sessions to `Secure; HttpOnly; SameSite=Lax` cookies, add a CSRF token for state-changing requests, shorten access-token lifetime and rotate refresh tokens. Keep a dual-read migration window so existing users are not signed out abruptly. Add a session list with “revoke other sessions”.

**Verification:** `document.cookie` must not contain a session; after login the token must not appear in `localStorage`; CSRF rejection must be tested; logout must clear the cookie and revoke server state.

---

### F-02 — Mutable, unversioned embed runtime — **High**

**Location:** `worker/index.js:47-50`, `server/index.js:206-209`, `popuploom.js:942`, install snippet in `app.js:507-513`.

**Evidence:** Customers install `https://popuploom.com/popuploom.js`. The file is served from a fixed path with `Cache-Control: no-store`; `Runtime.version = "1.1"` exists in code but the URL is not versioned. No SRI hash, signed release, published checksum or customer pinning mechanism is provided.

**Impact:** The embed runs inside every customer page. A compromise of the origin, Worker, build or deployment token gives an attacker code execution in all customer sites. Customers cannot pin a known-good version or verify what they loaded. This is supply-chain risk, not a theoretical style issue.

**Recommendation:** Publish immutable, content-addressed or semver paths such as `/embed/1.1.0/popuploom.js`, keep old versions available, publish SHA-256 hashes, document optional SRI for pinned versions, and add release notes plus a deprecation window. Keep live configuration updates separate from code updates so the auto-sync feature is preserved. Monitor the deployed script hash and alert on change.

**Verification:** A pinned URL must keep serving identical bytes; a new release must not mutate the old path; the published hash must match the served file; a customer can opt into a version and roll back.

---

### F-03 — Webhook SSRF filter can be bypassed with DNS names — **High (Express) / Medium (Worker)**

**Location:** `shared/webhook.js:29-87`, delivery at `shared/webhook.js:115-159`; used by `worker/widgets.js:153-174` and `server/routes/widgets.js:153-174`.

**Evidence:** The filter blocks literal loopback, private, link-local and metadata hostnames. It does not resolve the hostname before accepting or before connecting. The following values are accepted by the current validator:

```
https://127.0.0.1.nip.io/hook          -> ACCEPTED
https://169.254.169.254.nip.io/...      -> ACCEPTED
https://127.0.0.1.sslip.io/hook        -> ACCEPTED
https://10.0.0.1.sslip.io/hook         -> ACCEPTED
https://localtest.me/hook              -> ACCEPTED
```

**Impact:** On the Express runtime, a widget owner can make the server POST to loopback or cloud metadata endpoints, potentially reading instance credentials or probing internal services. On Cloudflare Workers, private-network fetch is constrained, but the validation model is still wrong and would become dangerous if the code runs in any environment with private network reachability.

**Recommendation:** Resolve the hostname before saving and again immediately before connecting; reject if any resolved address is loopback, private, link-local, multicast, reserved or a cloud metadata address. Pin the validated address for the connection where the platform allows it. Reject redirects (already done) and cap response size, time and redirect count. Consider an egress proxy or a destination allowlist for high-assurance deployments.

**Verification:** Unit tests with a mocked resolver for `nip.io`, `sslip.io`, `localtest.me`, decimal/hex IPv4 and IPv6-mapped addresses. Integration test must prove `https://127.0.0.1.nip.io` is rejected by default.

---

### F-04 — Visitor lead data duplicated in host-page `localStorage` — **Medium**

**Location:** `popuploom.js:876-882`.

**Evidence:** After a successful server submission, the runtime writes up to 200 submissions to `localStorage["pfsubs.<widget-id>"]` on the customer's website. The object contains the full submitted `data` payload.

**Impact:** The lead payload is now readable by every script on the customer's page, including analytics, ads, support widgets and any future XSS. It persists after the visitor leaves. This duplicates personal data outside the disclosed server-side store and makes deletion harder.

**Recommendation:** Remove local persistence of submitted lead data. If offline retry is required, store only an opaque request ID and a short-lived encrypted payload, clear it after acknowledgement, and document the behaviour. Add a migration that removes existing `pfsubs.*` keys.

**Verification:** After submission, no lead payload is present in `localStorage` or `sessionStorage`; a failed submission does not persist raw PII; the lead still lands in the inbox.

---

### F-05 — Public lead endpoint has no bot/abuse defence beyond per-IP rate limits — **Medium**

**Location:** `worker/widgets.js:232-255`, `server/routes/widgets.js:230-245`; limits at `worker/widgets.js:7-9`.

**Evidence:** `POST /api/widgets/:id/submit` accepts anonymous JSON up to 16 KB at 120 requests/minute/IP. The endpoint is publicly cross-origin. A known widget ID is visible in the customer's page source. There is no CAPTCHA, WAF rule, per-widget quota, origin allowlist or abuse scoring.

**Impact:** An attacker can fill D1 with junk leads, trigger webhook deliveries to the owner's endpoint, and consume storage/CPU. Rate limits slow but do not stop distributed abuse.

**Recommendation:** Add optional Cloudflare Turnstile or an equivalent privacy-respecting challenge, a per-widget submission quota/alert, WAF rate rules, and a retention cap. Keep the public endpoint working for legitimate sites; fail closed on abuse. Add a dashboard signal for abnormal volume.

**Verification:** Simulated distributed submissions are throttled or challenged; legitimate submission still succeeds; owner is alerted on a spike.

---

### F-06 — No MFA, admin roles or session management — **Medium**

**Location:** `worker/auth.js`, `server/auth.js`, `profile.html`, `account.js`; no TOTP/MFA/admin/role code found.

**Evidence:** Accounts have one role. There is no TOTP, recovery codes, session list, “revoke all” action or step-up authentication for sensitive actions. Account deletion and password change require the current password or Google credential, which is good, but a stolen session can call them if the attacker has the password.

**Impact:** Credential stuffing and phishing have no second factor. There is no least-privilege separation for future support staff. A stolen session cannot be reviewed or selectively revoked by the user.

**Recommendation:** Add optional TOTP with recovery codes, a session list with revoke-all, step-up authentication for password/email/webhook/deletion changes, and role separation before any support tooling is added. Log administrative actions.

**Verification:** MFA enrollment/login/recovery tests; a support role cannot read lead payloads; revoke-all invalidates every token.

---

### F-07 — Password hashing parameters below current guidance — **Medium**

**Location:** `worker/auth.js:9` (`PBKDF2_ITERATIONS = 100000`), `server/auth.js:58` (`bcrypt.hashSync(password, 10)`), reset hashing reuses these functions.

**Evidence:** PBKDF2-HMAC-SHA256 at 100,000 iterations is below the current OWASP recommendation of 600,000. bcrypt cost 10 is the historical minimum; current guidance favours cost 12+ where latency allows. There is no rehash-on-login for bcrypt cost 10.

**Impact:** If the database is exfiltrated, offline cracking is faster than it should be. The 12-character minimum and 72-byte cap help but do not replace work-factor hardening.

**Recommendation:** Move to Argon2id with a calibrated memory/time cost, or raise PBKDF2 to 600,000 and bcrypt to 12+ after benchmarking Worker CPU limits. Rehash on successful login with a stored algorithm marker. Keep the existing 72-byte compatibility cap during migration.

**Verification:** New hashes carry the new algorithm/iterations; legacy hashes upgrade after login; login latency remains within budget.

---

### F-08 — Webhook delivery is not a durable queue — **Medium**

**Location:** `shared/webhook.js:1-4`, `worker/widgets.js:248-253`, `server/routes/widgets.js:43-55`.

**Evidence:** Delivery uses `ctx.waitUntil` on the Worker and fire-and-forget on Express, with three in-memory attempts. If the isolate/process terminates after the response, the delivery is lost. There is no outbox, dead-letter queue, replay tool or scheduled retry.

**Impact:** Lead delivery can silently fail during deploys, isolate eviction, provider outages or timeouts. The lead is stored, but the customer's CRM/webhook never receives it. Security-relevant delivery logs can be incomplete.

**Recommendation:** Add a D1 outbox or Cloudflare Queue with idempotency keys, exponential backoff, dead-letter state and an owner-visible replay button. Keep the current synchronous attempt as the first try, but make durable retry the source of truth.

**Verification:** Kill the runtime after storing a lead but before delivery; the queued job must deliver later. A permanently failing endpoint must move to dead-letter and be replayable.

---

### F-09 — Retention and deletion are not fully defined or verified — **Medium**

**Location:** `worker/migrations/0001_init.sql`, `worker/migrations/0005_webhooks.sql`, `worker/auth.js:275-293`, `server/auth.js:160-178`, `privacy.html`.

**Evidence:** `submissions`, `webhook_deliveries`, `revoked_tokens` and `rate_limits` have no application-level TTL. Account deletion runs `DELETE FROM users WHERE id = ?` and relies on foreign-key cascades for widgets, submissions and webhooks. The Express test verifies the widget config becomes 404; it does not explicitly assert submission and webhook rows are gone in D1. The privacy page says data remains until deleted but does not state a retention schedule for each category.

**Impact:** Personal data can remain indefinitely; a D1 configuration without enforced foreign keys could leave orphaned leads; backups may outlive the deletion. This is a privacy/compliance gap, not a confirmed data leak.

**Recommendation:** Define retention for each table, add scheduled cleanup, perform explicit transactional deletion for account/widget removal (do not rely solely on cascades), document backup retention, and test deletion in D1. Add a data-deletion record without storing the deleted payload.

**Verification:** Create two accounts, leads, webhooks and deliveries; delete one account; assert all related rows are gone; restore a backup and confirm the retention policy.

---

### F-10 — No security monitoring, alerting or tested incident response — **Medium**

**Location:** repository-wide; `.github/workflows/deploy-cloudflare.yml` only checks health after deploy.

**Evidence:** No error tracker, uptime monitor, CSP report collector, auth-anomaly alert, script-hash monitor, DNS/TLS monitor or provider-warning monitor. No incident response document or incident register exists. No backup restore test is documented.

**Impact:** A compromise, broken deploy, expiring certificate or new provider warning may go unnoticed until users report it. The current reputation incident is itself an example: the warning was discovered manually, not through monitoring.

**Recommendation:** Add uptime and error alerting, CSP reporting, a daily deployed-script hash check, DNS/TLS/domain-expiry checks and a security-provider watch. Write an incident runbook with severity, containment, evidence preservation, credential rotation, notification and a post-incident review. Test a restore and record the result.

**Verification:** Trigger a synthetic alert; change a script hash in staging and confirm the alert; restore a backup into a clean environment.

---

### F-11 — CI/CD lacks security gates and production approval — **Medium**

**Location:** `.github/workflows/deploy-cloudflare.yml:1-63`.

**Evidence:** The workflow runs build, unit, integration and browser tests, then deploys on every push to `main`. There is no `npm audit` gate, secret scan, SAST, dependency-update bot, branch protection evidence or environment approval. `npm audit` is clean today, but nothing prevents a vulnerable dependency or committed secret from deploying tomorrow.

**Impact:** A supply-chain or accidental secret commit can reach production without a blocking check. A compromised maintainer account with push access can deploy directly.

**Recommendation:** Add `npm audit --audit-level=high`, secret scanning (gitleaks/TruffleHog), CodeQL or Semgrep, Dependabot/Renovate, lockfile validation and a protected `production` environment requiring review. Keep the existing pinned action SHAs and read-only permissions.

**Verification:** A test branch with a known-vulnerable dependency or fake secret must fail before deploy; direct pushes to production must be blocked by branch protection.

---

### F-12 — Public trust surface is incomplete — **Medium**

**Location:** `contact.html`, `privacy.html`, `terms.html`, `.well-known/security.txt`, homepage line 235, `SECURITY.md`.

**Evidence:** About, Contact, Privacy and Terms exist and are accurate at a high level. There is no `/security` page, no vulnerability disclosure policy page, no domain-based `security@` or `support@` address, no expected response window, no changelog or status page. `security.txt` points to a Gmail address and to the contact page, not a security policy. The homepage links draft recovery to `https://popforge.shailu3597.workers.dev/migration.html`, which weakens the branded identity.

**Impact:** Visitors and reviewers cannot easily verify ownership, disclosure process or operational status. A Gmail contact on a security-sensitive page looks less accountable than a domain address. The workers.dev link is exactly the kind of unexplained third-party host that automated scanners and cautious users distrust.

**Recommendation:** Publish `/security.html` with a disclosure policy, scope, safe-harbour statement (only if legally reviewed), response targets and contact. Create `security@popuploom.com` and `support@popuploom.com` via Cloudflare Email Routing, update `security.txt`, add a changelog and status page, and change the homepage recovery link to `https://popuploom.com/migration.html`.

**Verification:** Pages return 200, are linked from the footer, `security.txt` points to the security page and a monitored domain address, and the workers.dev link is gone from public pages.

---

### F-13 — Email and DNS hardening gaps — **Medium**

**Location:** DNS for `popuploom.com`, `send.popuploom.com`, `_dmarc.popuploom.com`; `wrangler.toml`.

**Evidence (2026-11-06):**

- Apex TXT contains only `google-site-verification=...`; **no apex SPF record** was returned.
- `send.popuploom.com` has SPF `v=spf1 ip4:52.3.252.119 ip4:44.222.39.36 ip4:199.249.231.0/24 ~all` and Resend DKIM at `resend._domainkey.popuploom.com`.
- DMARC is `p=quarantine; adkim=r; aspf=r; rua=mailto:dmarc_rua@onsecureserver.net`.
- **No CAA record** and **no DNSSEC** (`DS`/`DNSKEY` empty, `AD=false`).
- No MX record on the apex; mail is provider-based.
- RDAP shows registration 2026-11-01, expiry 2027-11-01, and `clientTransferProhibited` (transfer lock enabled).

**Impact:** Missing apex SPF and non-enforcing DMARC leave room for spoofed mail and reduce deliverability confidence. Missing CAA allows any CA to issue certificates; missing DNSSEC leaves DNS spoofing unmitigated at the resolver level. For a domain already flagged as phishing, these are trust multipliers.

**Recommendation:** Add a single correct apex SPF record that includes the actual sending service and ends in `-all`; move DMARC to `p=reject` after a monitored quarantine period; add CAA for the CAs actually used (Cloudflare and Resend as applicable); enable DNSSEC; confirm registrar MFA and auto-renew. Use a branded DMARC address.

**Verification:** `dig`/DoH shows one SPF, `p=reject`, CAA and DS; send a test message and confirm DMARC pass; monitor aggregate reports.

---

### F-14 — Header and runtime consistency gaps — **Low**

**Location:** `server/security.js:18`, `worker/security.js:27-62`, live headers.

**Evidence:**

- Express `htmlFiles` still lists only the older pages; `faq.html`, `press.html` and the three use-case guides are missing from the local CSP hash map. Production Worker is correct.
- Every static HTML response carries `Access-Control-Allow-Origin: *` because the origin helper treats all non-API routes as public. There are no credentials on those responses, so this is unnecessary rather than dangerous.
- HSTS is `max-age=31536000` without `includeSubDomains` or `preload`.
- No `Cross-Origin-Opener-Policy` or `Cross-Origin-Resource-Policy` headers.
- `img-src` allows `https: http: data:` broadly.
- `workers_dev = true` in `wrangler.toml`; legacy runtime relies on it, but it creates a second host that serves HTML pages (they redirect for known pages).

**Impact:** Low direct risk; these are consistency and defence-in-depth issues. The Express CSP drift could silently break inline scripts on newer pages in local/alternate deployments.

**Recommendation:** Generate the Express CSP page list from the same manifest as the Worker, scope `Access-Control-Allow-Origin` to API responses, add COOP/CORP, consider HSTS `includeSubDomains` after verifying all subdomains, and document why `workers_dev` remains enabled or restrict it to runtime/API paths.

**Verification:** Header tests on every public page in both runtimes; `faq.html` and `press.html` CSP includes their hashes.

---

### F-15 — Registration enables email enumeration — **Low**

**Location:** `worker/auth.js:118-119`, `server/auth.js:56-57`.

**Evidence:** Registering an existing email returns “An account with that email already exists”; a new email returns 201. Login and password reset are deliberately generic.

**Impact:** An attacker can test whether an address has a PopupLoom account. This is a common trade-off, but it conflicts with the plan’s account-enumeration protection goal.

**Recommendation:** Return a generic response and send a verification/notification email, or require email verification before revealing account state. Keep rate limits.

**Verification:** Existing and new addresses return the same status/body/timing shape.

---

### F-16 — View counts are trivially inflatable — **Low**

**Location:** `worker/widgets.js:224-229`, `server/routes/widgets.js:223-227`.

**Evidence:** `POST /api/widgets/:id/view` is public and increments a counter with only per-IP rate limiting.

**Impact:** View metrics are not trustworthy for reporting or future billing. No account data is exposed.

**Recommendation:** Label views as approximate, deduplicate by a rotating visitor key, or move to event-level analytics with abuse controls. Do not use the counter for billing or security decisions.

**Verification:** Repeated submissions from one client do not produce an unbounded count.

---

## 5. Reputation investigation

### R-01 — Gridinsoft “Phishing” classification — **High business risk, not a confirmed code vulnerability**

**Public report:** `https://gridinsoft.com/online-virus-scanner/url/popuploom-com`

Observed on 2026-11-06:

- Title: “Popuploom.com Warning: Do Not Enter Passwords (1/100 Trust Score)”.
- Classification: **Phishing**, dated 2026-11-02 18:50.
- Domain age at report: **5 days**.
- “1 external provider warning” attributed to **SOCRadar**.
- Negative signals include “security-provider warnings”, “a malware or phishing blacklist detection (1)”, “heuristic signals associated with phishing”, “limited independent reputation data” and a young domain.
- The “What is Popuploom?” text is generic credential-theft boilerplate (“impersonation first, urgency second, data request last”), not a description of a specific PopupLoom page.
- Detected themes: 18+, Shopping, Deals, Beauty, Electronics; “Registration Form”; “Automated page analysis detected form or data-entry functionality”.

### URLScan evidence

The public URLScan search API returns eight scans of PopupLoom studio template URLs on 2026-11-02 between 10:34 and 11:54 UTC:

| Time (UTC) | URL | Tags | Labels | Verdict |
| --- | --- | --- | --- | --- |
| 11:54 | `/studio.html?tpl=guaranteeSeal` | `@ecarlesi,possiblethreat,phishing` | none | none |
| 11:41 | `/studio.html?tpl=proofPulse` | same | none | none |
| 11:28 | `/studio.html?tpl=comebackCode` | same | none | none |
| 11:18 | `/studio.html?tpl=cornerPeek` | same | none | none |
| 11:06 | `/studio.html?tpl=lowStock` | same | none | none |
| 10:55 | `/studio.html?tpl=firstCode` | same | none | none |
| 10:45 | `/studio.html?tpl=giveaway` | same | none | none |
| 10:34 | `/studio.html?tpl=blank` | same | none | none |

The tags are **submitter-applied**, not a URLScan verdict. All eight labels and verdict fields are empty. One scan is the **blank** template. This pattern is consistent with automated or indiscriminate tagging, not observed credential theft.

### Google and domain evidence

- Google Search Console → **Security issues: “No issues detected.”**
- Google Search Console → **Manual actions: “No issues detected.”**
- Google Safe Browsing transparency endpoint returned no unsafe-content flags at audit time.
- VirusTotal could not be checked because the public endpoint returned HTTP 429; no API key was available.
- SOCRadar’s exact detection URL and evidence were not available without an account. Gridinsoft names SOCRadar, but that attribution is not proof of independent malicious behaviour.
- RDAP confirms the domain was registered on 2026-11-01, expires 2027-11-01 and has a transfer lock. The young age is a real signal scanners weigh; it cannot be fixed by code.

### Assessment

The most likely root cause is a **false-positive chain**: a very young domain + demo popup templates that look like giveaways/stock/guarantee offers + eight URLScan submissions tagged `possiblethreat,phishing` + a provider (SOCRadar) ingesting those tags + Gridinsoft weighting the single external warning and domain age.

This does **not** prove PopupLoom is safe in every respect; it means the public phishing classification is not supported by the code review or Google’s own security reports. It should be challenged with evidence after the trust fixes are live.

### Recommended reputation sequence

1. **Do not submit repeated removal requests now.** Preserve the URLScan/Gridinsoft evidence and the GSC “no issues” result.
2. Add an unmistakable demo watermark to every studio preview, not only the small tag in the gallery. A screenshot of a “Guarantee Seal” or “Low Stock” popup must visibly say “Demo preview — not a live offer.”
3. Change the homepage migration link from the workers.dev host to `https://popuploom.com/migration.html`; keep the legacy host only for installed runtime compatibility.
4. Publish `/security.html`, domain-based security/support addresses, retention/incident sections and the changelog/status pages.
5. Fix the High findings (F-01/F-02/F-03) and the email/DNS gaps (F-13).
6. Contact **URLScan** first: the tags are user-applied and the scans include `tpl=blank`; ask for tag removal/reclassification and provide the GSC evidence.
7. Contact **SOCRadar** through its official reporting channel with the exact URL, classification, date and remediation evidence.
8. Claim the Gridinsoft profile via `portal.gridinsoft.com` and request re-evaluation with the same evidence. Do not promise that any provider will change its verdict.
9. Monitor weekly; document each response.

---

## 6. Trust and policy gaps

| Area | Current state | Gap |
| --- | --- | --- |
| About | Exists; states independent operator Shailu; no invented company details | Could add product history and a clearer “who is behind it” section |
| Contact | `support@popuploom.com` and `security@popuploom.com` are routed through Cloudflare Email Routing to a verified destination; response targets on `/security.html` | Add a monitored abuse/legal channel if volume requires |
| Privacy | Covers accounts, leads, browser storage, webhooks, Resend, Cloudflare, ads status | No per-category retention schedule, no incident-notification section, vague local-storage disclosure |
| Terms | Covers acceptable use, accounts, leads, integrations, suspension, liability | Legal review still needed; no explicit data-export/deletion procedure |
| Security page | Missing | Publish disclosure policy, scope, safe harbour (if reviewed), contact, response targets |
| `security.txt` | Present; Gmail contact; policy points to Contact | Point to `/security.html`; add domain email; consider Encryption |
| Changelog | Missing | Publish real releases only; no invented history |
| Status page | Missing | Publish only real monitored states |
| Migration link | Homepage links `workers.dev` | Use the apex `/migration.html`; keep legacy only for runtime |
| Demo clarity | Small “Demo preview” tag in gallery; studio preview can look like a live offer | Add a persistent, high-contrast demo watermark and copy |
| External identity | No `sameAs` profiles yet | Add only after real profiles exist; never invent |

---

## 7. Risk heat map

| ID | Finding | Severity | Exploitability | Fix effort |
| --- | --- | --- | --- | --- |
| F-01 | 30-day token in localStorage | High | Requires XSS/script compromise | Medium |
| F-02 | Mutable embed runtime | High | Requires origin/deploy compromise | Medium |
| F-03 | Webhook SSRF via DNS | High | Authenticated owner | Small–Medium |
| R-01 | Phishing false positive | High (business) | External | Medium |
| F-04 | Lead PII in host localStorage | Medium | Any host script | Small |
| F-05 | Public submission abuse | Medium | Anonymous | Small–Medium |
| F-06 | No MFA/admin roles | Medium | Credential theft | Medium |
| F-07 | Hashing below guidance | Medium | DB exfiltration | Small |
| F-08 | No durable webhook queue | Medium | Runtime failure | Medium |
| F-09 | Retention/deletion gaps | Medium | Policy/ops | Small–Medium |
| F-10 | No monitoring/incident response | Medium | Ops | Medium |
| F-11 | CI security gates missing | Medium | Supply chain | Small |
| F-12 | Trust surface incomplete | Medium | Trust | Medium |
| F-13 | Email/DNS hardening | Medium | Spoofing/CA | Small |
| F-14 | Header/runtime consistency | Low | Low | Small |
| F-15 | Email enumeration | Low | Anonymous | Small |
| F-16 | Inflatable view counts | Low | Anonymous | Small |

---

## 8. Recommended implementation order

### Phase 0 — Preserve evidence (now)

- Save the Gridinsoft report, URLScan results, GSC “No issues” screenshots and RDAP output.
- Do not change DNS/email/reputation records until the fixes are ready.
- Do not send repeated reclassification requests.

### Phase 1 — Immediate, low-risk fixes (days 1–7)

1. **F-03** DNS-aware webhook validation (both runtimes) + tests.
2. **F-04** stop writing lead payloads to host `localStorage`; clear existing keys.
3. **F-12** publish `/security.html`; create `security@`/`support@`; update `security.txt`; change the homepage migration link to the apex.
4. **F-13** add apex SPF, CAA, DNSSEC plan, DMARC enforcement plan.
5. **R-01** add the demo watermark and prepare the reclassification evidence pack.

### Phase 2 — Authentication and embed (weeks 2–3)

6. **F-01** cookie-based sessions behind a feature flag; CSRF; session list/revoke-all.
7. **F-02** versioned embed assets, published hashes, release notes, rollback.
8. **F-07** Argon2id or higher PBKDF2/bcrypt with rehash-on-login.
9. **F-06** optional TOTP and role model before any support tooling.

### Phase 3 — Data lifecycle and reliability (weeks 3–4)

10. **F-05** Turnstile/WAF/per-widget quotas.
11. **F-08** durable webhook outbox/queue with dead-letter and replay.
12. **F-09** retention schedule, explicit deletion transaction, D1 deletion test.

### Phase 4 — Operations and assurance (weeks 4–6)

13. **F-10** monitoring, CSP reports, script-hash check, incident runbook, restore test.
14. **F-11** CI audit/secret/SAST gates, Dependabot, protected production environment.
15. **F-14** header/runtime consistency.
16. External ASVS L1/L2 assessment focused on auth, API, webhooks and the embed; do not advertise a penetration test before it is complete.

### Phase 5 — Reputation (after fixes are live)

17. Request URLScan tag correction, SOCRadar re-evaluation and Gridinsoft profile review with evidence.
18. Continue consistent public facts and directory profiles.
19. Monitor Google/Bing/provider warnings weekly.

---

## 9. Acceptance criteria status

| Criterion | Status |
| --- | --- |
| No known malicious redirect/content | **Pass** in code review; GSC reports no security/manual issues |
| All provider detections investigated | **Partial** — Gridinsoft/SOCRadar identified; SOCRadar portal unavailable |
| Re-evaluation requests submitted | **Not yet** — intentionally after fixes |
| DNS/registrar access secured | **Partial** — transfer lock present; MFA/auto-renew not verifiable from here |
| About/Contact/Privacy/Terms | **Pass** — exist and are accurate at a high level |
| Security page | **Fail** — missing |
| Domain support/security email | **Fail** — Gmail only |
| Passwords hashed | **Pass** — PBKDF2/bcrypt, but work factor below current guidance |
| Reset flow | **Pass** — hashed, single-use, 30 min, session revocation |
| Rate limiting | **Pass** — atomic, spoof-resistant; abuse defence still limited |
| Session security | **Partial** — revocation exists; localStorage and 30-day token remain |
| MFA | **Fail** — not implemented |
| Account deletion | **Partial** — code exists; D1 cascade not explicitly tested |
| Object-level authorization | **Pass** — tests cover cross-account access |
| SQL injection | **Pass** — prepared statements |
| Backups restored | **Not verified** |
| Embed code reviewed | **Pass** — strong escaping; isolation/versioning missing |
| No host credential collection | **Pass** — no such code found |
| postMessage origin validation | **N/A** — no postMessage layer |
| Webhook secrets not in public config | **Pass** — server-side secrets are owner-only |
| SSRF protections | **Fail** — DNS bypass confirmed |
| Webhook signatures/retries | **Pass** — HMAC, retries, logs; not durable |
| Retention/deletion policy | **Partial** — deletion exists; retention schedule missing |
| Privacy disclosures match implementation | **Partial** — mostly accurate; local-storage and retention gaps |
| Dependency/secret scanning | **Fail** — not in CI |
| Monitoring/incident response | **Fail** — not implemented |
| Independent assessment | **Not performed** |

---

## 10. Evidence log

Commands and observations used (no production data modified):

```text
npm test                         -> 49 passed, 0 failed
npm run test:cf                  -> 13 passed, 0 failed
npm run test:cf:integration      -> 116 passed, 0 failed
npm audit                        -> 0 vulnerabilities
git ls-files .env ...            -> no tracked .env/private data/database
live headers                     -> CSP, HSTS, X-Frame-Options DENY, nosniff,
                                    strict-origin-when-cross-origin, Permissions-Policy
live API                         -> /api/auth/me 401, /api/widgets 401,
                                    unknown config 404
CORS                             -> private API rejects untrusted Origin
DNS                              -> no apex SPF, DMARC p=quarantine,
                                    no CAA, no DNSSEC, send subdomain SPF+DKIM
RDAP                             -> registered 2026-11-01, transfer lock
URLScan API                      -> 8 studio scans, user tags, no verdict/labels
Google Search Console            -> Security issues: none; Manual actions: none
Gridinsoft                       -> Phishing, 1/100, SOCRadar external warning
webhook validator                -> nip.io/sslip.io/localtest.me accepted
```

Live header example (abridged):

```text
Content-Security-Policy: default-src 'self'; base-uri 'none'; object-src 'none';
  frame-ancestors 'none'; form-action 'self'; script-src 'self' 'unsafe-hashes'
  https://accounts.google.com/gsi/ https://static.cloudflareinsights.com
  'sha256-...'; style-src 'self' 'unsafe-inline' ...; img-src 'self' https: http: data:
Strict-Transport-Security: max-age=31536000
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

---

## 11. Limitations

- This is a source and configuration review plus existing automated tests. It is **not** a penetration test, load test or formal ASVS assessment.
- No production database rows were read or modified. Deletion/cascade behaviour in D1 was inferred from schema and Express tests, not destructive production testing.
- VirusTotal returned HTTP 429; no API key was available. SOCRadar’s portal was not accessible. Their verdicts may differ from the public evidence summarised here.
- No live Google token exchange, third-party webhook receiver, browser extension, WAF or Cloudflare account policy was exercised.
- DNS values are a snapshot at audit time; they can change.
- The absence of a finding does not prove the absence of a vulnerability. A qualified independent assessor should review authentication, the embed and webhook egress before any public security claim is made.

---

## 12. Recommended next action

Review the High findings and approve Phase 1 only:

1. DNS-aware webhook validation.
2. Remove lead PII from host-page localStorage.
3. Publish the security/trust pages and domain addresses.
4. Add SPF/CAA/DNSSEC and plan DMARC enforcement.
5. Add the demo watermark and prepare the reputation evidence pack.

Do not start with the full document. Phase 1 is small, testable and does not change the public embed contract or customer widget IDs.
