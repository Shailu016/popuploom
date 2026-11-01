# Security review

Reviewed: 2026-11-01. Scope: this repository, local API, Cloudflare Worker and browser runtime.

## Rebrand migration boundaries

The PopupLoom identity migration keeps the security model unchanged:

- `/popuploom.js` and `/popforge.js` serve the same bytes and are never redirected across hosts, so an installed site's CSP can keep allowing its existing script origin.
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
- **Input complexity:** deeply nested or prototype-related config and lead data are rejected before serialization. Page glob matching no longer builds a potentially expensive regular expression from user configuration.
- **Embedded media and styling:** video frames accept only HTTPS YouTube/Vimeo player hosts, use a sandbox, and cannot navigate the top-level page. Spin-wheel color values use the same color validation as other theme fields.
- **Credentials and logging:** new passwords require 12 characters and retain bcrypt's 72-byte limit. Existing passwords remain usable. Oversized Google credentials are rejected, framework identification is disabled, and unknown widget IDs no longer create attacker-controlled warning logs.

Google's authoritative-email rules are documented at:
https://developers.google.com/identity/gsi/web/guides/verify-google-id-token

## Evidence

- `npm test`: **26 groups passed, 0 failed, 0 skipped**.
- Worker integration suite: **79 assertions passed**, including legacy/new host policy, runtime alias identity and migration noindex.
- Real headless Chrome tested every one of the 45 templates, studio behavior, mobile layouts, blocked script/event-handler injections, legitimate inline controls, and server-revoked logout.
- API checks cover cross-account access, private files, forged/revoked sessions, origin rejection, public embed compatibility, depth/size/encoding rejection, rate-limit bypass attempts, retry deduplication and pagination.
- Migration checks cover dual runtime paths loaded in either order, dual attribute handling, API override precedence, legacy analytics, host-specific redirects, non-redirected API/runtime requests and replayed scans.
- Authentication fixtures verify the signed-claim mapping and Gmail/Workspace/third-party linking rules. CSP tests cover per-page hashes, line endings and edits.
- npm audit: **0 known vulnerabilities**, production and development dependencies included.
- Tests use isolated temporary databases and browser profiles. The existing project database was not used.

## Deployment and trust boundaries

Restart the server to load these changes; startup adds the token-revocation table automatically. Use HTTPS and NODE_ENV=production with a unique random JWT_SECRET. HSTS is sent on secure production requests. Configure TRUST_PROXY only for actual trusted proxy addresses and APP_ORIGINS only for trusted frontend origins.

Google linking is automatic only when Google is authoritative for the email. Existing password accounts using other email providers must use email/password sign-in; no current-email ownership challenge service is configured. Newly registered Google identities can still sign in by their verified subject.

Widget configs, links, images, coupon codes and client-side webhook URLs are public to visitors who install or view the widget. Never put passwords, privileged API credentials or private outbound webhook secrets in embed configuration. This server does not fetch arbitrary configured webhook URLs, so this client-side feature does not create a server-side URL-fetch/SSRF endpoint.

View and submission endpoints are intentionally public. Rate limits reduce simple abuse but do not establish visitor identity or stop distributed bot traffic. Counters are process-local; deployments with multiple instances need a shared limiter or an edge service. Configure backups, retention and operating-system/database access controls for captured lead data.

Bearer tokens remain in browser localStorage for compatibility with the existing API; avoid adding untrusted scripts to the studio origin. HTML framing is blocked; customer websites can still embed the standalone runtime normally.

A live Google consent/token exchange, real external webhook receiver, production TLS/proxy setup, external penetration test and sustained traffic load were not exercised. Dependency audit results reflect published advisories available during this run, not a guarantee against unknown vulnerabilities.
