# Security review

Reviewed: 2026-11-01. Updated: 2026-11-07. Scope: this repository, local API, Cloudflare Worker and browser runtime.

Current status and remaining work: `SECURITY_AUDIT.md` and `SECURITY_REMEDIATION.md`. Live headers and controls: `SECURITY_HEADERS.md`, `EMBED_SECURITY.md`, `WEBHOOK_SECURITY.md`.

## Rebrand migration boundaries

The PopupLoom identity migration keeps the security model unchanged:

- `/popuploom.js` serves the current runtime and is never redirected across hosts, so an installed site's CSP can keep allowing its existing script origin.
- Page redirects are limited to an exact allowlist of known browser pages and method GET/HEAD. `/api/*`, runtime files, assets and `/migration.html` stay on the host that received the request.
- Redirect targets are built from a fixed apex origin plus the validated request path/query. The Worker does not trust a user-supplied Host header.
- The migration page is `noindex,nofollow`, reads only `pf.widgets` in the browser, performs no upload, and never clears or overwrites drafts.
- The new CSRF/CORS surface is unchanged: public widget endpoints remain cross-origin by design; private endpoints still require same-origin and authorization.
- CSP hashes are regenerated for the new `migration.html` inline script; no `unsafe-inline` script policy was added.

## Fixed findings and hardening

- **Account linking:** an ID token for a historically verified third-party email could previously replace an existing password account. Automatic linking now requires a Gmail address or a verified Google Workspace hosted-domain claim. Other existing accounts keep password sign-in. Google identities already linked to an account continue to use their stable subject identifier.
- **Session revocation:** signing out previously removed only the browser token, leaving copied bearer tokens valid. Logout now revokes that token in SQLite, and authenticated endpoints check revocation. Newly issued tokens have unique IDs so simultaneous sessions remain independent.
- **Browser execution and framing:** HTML responses now use per-page Content Security Policy hashes, deny framing, disable object embedding and base-URL changes, restrict browser capabilities, and add referrer/MIME protections. The policy blocks arbitrary injected scripts and event handlers while authorizing the application's existing controls. Hashes normalize HTML line endings and refresh after edits. Inline styles remain enabled for the popup editor's generated styling.
- **Origin boundaries:** private APIs reject browser origins outside the application's own origin and APP_ORIGINS. Public widget config/events and static embed assets retain cross-origin access. Bearer authorization remains required for owner data; CORS does not replace authorization.
- **Resource abuse:** view writes and API requests have bounded per-IP rates. Limits and origin checks run before JSON parsing; compressed and oversized bodies are rejected. Lead reads default to 200 records, up to 500 per request, with a before-ID cursor.
- **Widget identifiers:** database ids are always server-generated from 96 random bits. A client-supplied `config.id` is overwritten on create, so a new account cannot reclaim a deleted widget's id and have an embed left on a customer site start serving different content.
- **Input complexity:** deeply nested or prototype-related config and lead data are rejected before serialization. Page glob matching no longer builds a potentially expensive regular expression from user configuration.
- **Embedded media and styling:** video frames accept only HTTPS YouTube/Vimeo player hosts, use a sandbox, and cannot navigate the top-level page. Spin-wheel color values use the same color validation as other theme fields.
- **Credentials and logging:** new passwords require 12 characters and retain bcrypt's 72-byte limit. Existing passwords remain usable. Oversized Google credentials are rejected, framework identification is disabled, and unknown widget IDs no longer create attacker-controlled warning logs. Failed logins for unknown or Google-only accounts still perform one password check, so response timing does not disclose which emails are registered.

Google's authoritative-email rules are documented at:
https://developers.google.com/identity/gsi/web/guides/verify-google-id-token

## Password reset

Password reset is available for email/password accounts and deliberately unavailable for Google-only accounts, which keep using Google sign-in.

- **Tokens:** 32 bytes from the platform CSPRNG (256 bits), base64url-encoded. The database stores only the SHA-256 hex digest, the user id, normalized email and created/expires/used timestamps. Raw tokens never enter D1, SQLite, logs, analytics or browser storage.
- **Lifetime and reuse:** 30 minutes. A conditional `UPDATE … WHERE used_at IS NULL AND expires_at > ?` is the single-use gate, so a replayed or concurrent request cannot consume the token twice. Requesting a new link marks every earlier outstanding token for that account used.
- **Atomicity and revocation:** after consumption, the password hash is replaced and `token_version` is incremented. Every existing bearer session is rejected on its next request. Password hashing keeps the existing bcrypt (Express) / PBKDF2-SHA256 (Worker) approach.
- **Token comparison:** the row is selected by hash and the digest is re-checked with a constant-time comparison before consumption, so comparisons do not branch on secret contents.
- **Enumeration:** `POST /api/auth/forgot-password` returns exactly the same status and body for an unknown address, a Google-only account and an existing password account. Delivery happens after the response (`ctx.waitUntil` on the Worker, `setImmediate` on Express), so provider latency and provider failures cannot be observed by the requester. Provider errors are logged without the token, recipient or response body.
- **Rate limits:** per-IP (20 requests / 15 min) and per-normalized-email (5 / 15 min) for reset requests; per-IP (30 / 15 min) for token consumption. Email counters store a SHA-256 hash of the address, not the address itself.
- **Password policy:** at least 12 characters and at most 72 UTF-8 bytes, identical to registration and account password changes. The API rejects a token whose format is not exactly 43 base64url characters, and always answers with one generic invalid/expired message for malformed, expired, reused or unknown tokens.
- **Browser handling:** `/reset-password.html` is `noindex,nofollow`, sends `Referrer-Policy`-equivalent `no-referrer` metadata, reads the token from the URL fragment (fragments are never sent to the server or in `Referer`), and calls `history.replaceState` to remove it from the address bar. The token lives only in a closure until the POST. It is never written to `localStorage`, `sessionStorage`, URLs of subsequent requests, or logs.
- **CSRF and body limits:** the existing same-origin/`APP_ORIGINS` browser policy applies to both routes. They are JSON POSTs, use the global 192 KB bounded body parser, and are `no-store`.
- **Email provider:** Resend is called server-side with `fetch`. `RESEND_API_KEY` is an encrypted Worker secret (or an Express `.env` value) and is never sent to a browser. `RESEND_API_KEY`, `RESET_EMAIL_FROM` and `PUBLIC_ORIGIN` are validated at request time; if any is missing, both routes return a clear `503 RESET_EMAIL_NOT_CONFIGURED` message and no email is attempted. No reset email contains a password. The email link is HTTPS outside local development.
- **Delivery limits:** Resend's free plan is 3,000 emails/month and 100/day. The sending domain must pass Resend's SPF and DKIM verification. Provider rate-limit failures do not expose account existence.

## Evidence

- `npm test`: **43 groups passed, 0 failed, 0 skipped** (33 existing regression groups + 10 password-reset groups, including a real headless-browser pass of the reset UI).
- Worker unit suite: **12 tests passed**, covering legacy password upgrade, secret enforcement, shared rate counters, server-generated widget ids, generic login failures, packaging, reset token hashing/expiry/single-use/session revocation, generic unknown/Google-only responses and hashed email rate-limit keys.
- Worker integration suite: **106 assertions passed**, including legacy/new host policy, HTTPS upgrades, hardened 404s, runtime alias identity, migration noindex and the Worker reset endpoints.
- Real headless Chrome tested every one of the 53 templates, studio behavior, mobile layouts, blocked script/event-handler injections, legitimate inline controls, server-revoked logout, the login **Forgot password?** link, the request form, the tokenized reset form, fragment-token cleanup and the absence of token leakage into storage, request URLs, headers or console logs.
- API checks cover cross-account access, private files, forged/revoked sessions, origin rejection, public embed compatibility, depth/size/encoding rejection, rate-limit bypass attempts, retry deduplication and pagination.
- Migration checks cover dual runtime paths loaded in either order, dual attribute handling, API override precedence, legacy analytics, host-specific redirects, non-redirected API/runtime requests and replayed scans.
- Authentication fixtures verify the signed-claim mapping and Gmail/Workspace/third-party linking rules. CSP tests cover per-page hashes, line endings and edits.
- npm audit: **0 known vulnerabilities**, production and development dependencies included.
- Tests use isolated temporary databases and browser profiles. The existing project database was not used.

## Deployment and trust boundaries

Restart the server to load these changes; startup adds the token-revocation, password-reset and webhook tables automatically. On Cloudflare, apply the D1 migrations (`0005_webhooks.sql` for an existing database) before deploying the code that uses them. Use HTTPS and NODE_ENV=production with a unique random JWT_SECRET. HSTS is sent on secure production requests. Configure TRUST_PROXY only for actual trusted proxy addresses and APP_ORIGINS only for trusted frontend origins. For password reset, set `RESEND_API_KEY` (encrypted Worker secret or Express `.env`), `RESET_EMAIL_FROM` to a sender on the verified `popuploom.com` domain, and `PUBLIC_ORIGIN=https://popuploom.com`. Without the key the reset routes return a clear 503; no account data or tokens are exposed.

Google linking is automatic only when Google is authoritative for the email. Existing password accounts using other email providers must use email/password sign-in; no current-email ownership challenge service is configured. Newly registered Google identities can still sign in by their verified subject.

Widget configs, links, images, coupon codes and client-side webhook URLs are public to visitors who install or view the widget. Never put passwords, privileged API credentials or private outbound webhook secrets in embed configuration. The in-popup webhook runs in the visitor's browser. Server-side lead webhooks are owner-only and store their URL and signing secret outside the public config. Because the server fetches owner-supplied URLs, validation requires HTTPS, rejects embedded credentials, redirects, loopback/private/link-local addresses and `.local`/`.internal` hostnames, and only permits HTTP and loopback when `ALLOW_INSECURE_WEBHOOKS=true` for local development or tests. Cloudflare Workers also block fetches to private network addresses. These controls reduce SSRF risk but do not replace reviewing outbound destinations; keep signing secrets private.

View and submission endpoints are intentionally public. Rate limits reduce simple abuse but do not establish visitor identity or stop distributed bot traffic. Worker rate counters live in D1 and are shared by isolates; the Express development server uses an in-process limiter. Public submissions still cost one D1 write, so an edge WAF rate limit or CAPTCHA is the next step if abuse appears. Configure backups, retention and operating-system/database access controls for captured lead data.

Bearer tokens remain in browser localStorage for compatibility with the existing API; avoid adding untrusted scripts to the studio origin. HTML framing is blocked; customer websites can still embed the standalone runtime normally.

A live Google consent/token exchange, a real third-party webhook provider, production TLS/proxy setup, external penetration test and sustained traffic load were not exercised. Webhook signing, retries, delivery logs and private-address rejection were tested against local receivers. Dependency audit results reflect published advisories available during this run, not a guarantee against unknown vulnerabilities.
