# Cloudflare deployment

Use Node 22.13+ and `npm ci`. Run `npm run test:cf`, `npm run test:cf:integration`, and `npm test`.

The build copies only frontend files and assets into `.cf-build/public` and regenerates CSP hashes. `wrangler deploy` also runs this build. The build publishes the current runtime as `/popuploom.js` and as the newest immutable release under `/embed/<version>/`; older releases are served from `embed-releases/`. Private exports, `.dev.vars`, `.wrangler` state and recovered backups are ignored by Git. Owner site-verification values also enter the bundle at build time: `SITE_VERIFICATION_METAS` (`name=content` pairs, e.g. from a GitHub secret) becomes `<meta>` tags inside every page head, and any root-level `google*.html` or `BingSiteAuth.xml` is copied as a drop file. Both are strict-validated in `shared/verification.js`; missing or lookalike names are hardened 404s.

Before deployment create or select a D1 database, put its real `database_id` into `wrangler.toml`, configure `JWT_SECRET` with `wrangler secret put JWT_SECRET`, and configure `GOOGLE_CLIENT_ID` if needed. `JWT_SECRET` must be unique and at least 32 characters. It is required in every Worker environment; for local development use an ignored `.dev.vars` file. `npm run deploy:cf` rejects the placeholder database ID. No production resources are created by the tests.

Password reset email uses Resend. Store the API key as an encrypted Worker secret (`wrangler secret put RESEND_API_KEY`) and set the non-secret `RESET_EMAIL_FROM` (for example `PopupLoom <reset@popuploom.com>`) and `PUBLIC_ORIGIN` (`https://popuploom.com`) in `[vars]`. Add `popuploom.com` as a sending domain in Resend and publish the exact DNS values from its **Records** tab: normally an MX and SPF TXT record on the `send` subdomain, DKIM at `resend._domainkey`, and a DMARC policy at `_dmarc`; newer domains may receive CNAMEs for SPF instead. Keep any CNAMEs on Cloudflare DNS-only (grey cloud), not proxied. Wait for Resend to show the domain as verified. The free plan allows 3,000 emails/month and 100/day. Until `RESEND_API_KEY` and the sender are set, both reset endpoints return `503 RESET_EMAIL_NOT_CONFIGURED` with a setup message; no request is sent and no account information is revealed.

Apply schema migrations with `wrangler d1 migrations apply DB --remote` when the API token has D1 edit permission. The current deploy token does not, so the Worker also guards the verification schema idempotently at runtime (see `ensureVerificationSchema` in `worker/auth.js`). This includes `worker/migrations/0005_webhooks.sql` (server-side webhook endpoints and delivery logs) and `worker/migrations/0006_email_verification.sql` (signup verification; existing users default to verified). Schema migrations contain no customer data and do not modify existing users, widgets, submissions or credentials. For a fresh import only, `npm run db:export` reads the source database without changing passwords and writes `private-data/snapshot.sql`. Existing files are never overwritten; choose `EXPORT_PATH` for another snapshot. Import explicitly with `wrangler d1 execute DB --remote --file private-data/snapshot.sql` only into the intended empty destination. Keep backups private. The earlier generated snapshot is preserved as `private-data/0002_data.original.sql` and is not applied automatically.

Lead webhooks are called by the Worker after a lead is stored. Their URLs must be HTTPS and private/localhost destinations are rejected; `ALLOW_INSECURE_WEBHOOKS=true` exists only for local development and tests and must not be set in production. Delivery is retried in the background and recorded in `webhook_deliveries`; it is not a durable queue. Cloudflare Workers block fetches to private network addresses in addition to the application-level checks.

Advertising is live on the public content allowlist as of 2026-11-09. Google AdSense shows `popuploom.com` as **Ready**, the Google Privacy & messaging CMP has its European message published for the domain, `/ads.txt` is authorised and `ADSENSE_SLOT` names the real responsive unit. `ADSENSE_ENABLED` and `ADSENSE_APPROVED` are `true`. The build validates a complete configuration and fails if `ADSENSE_ENABLED=true` is combined with a missing/invalid client, slot, approval or CMP gate. `shared/ads.js` injects at most one labelled responsive unit into the public content allowlist; `shared/ad-pages.js` excludes the editor, account, lead, reset, recovery and customer-embed surfaces. Eligible responses use a per-response script nonce and strict-dynamic CSP; excluded/disabled responses load no advertising resource. A real `ADSENSE_PUBLISHER_ID` generates `/ads.txt` with the exact Google record; never commit a placeholder.

Legacy bcrypt passwords remain valid and upgrade to PBKDF2 after successful login. Legacy bcrypt verification uses JavaScript CPU; validate CPU usage on the chosen Cloudflare plan before migrating production traffic (a paid Worker plan may be required). New passwords use WebCrypto PBKDF2.

Rate counters use atomic D1 upserts shared across isolates with hashed IP keys and periodic expiry cleanup. These produce D1 writes and are not a substitute for edge protection against large distributed attacks. Config reads use no-store and D1 directly to avoid per-location cache invalidation problems. Review D1 usage and production traffic capacity before launch.

The integration suite runs the actual Wrangler bundle using an isolated SQLite-backed D1 adapter and local HTTP bridge; it does not emulate every Cloudflare runtime/CPU constraint. A live Cloudflare/D1 smoke test and real Google sign-in still need validation after configuration. Existing production data is never used by the suites.

## Host policy

`shared/host-policy.js` is imported by both `worker/index.js` and `server/index.js`. It:

- treats `https://popuploom.com` as the canonical apex;
- redirects `www.popuploom.com` browser pages to the same apex path and query;
- redirects only known browser pages from the former `workers.dev` host;
- leaves `/popuploom.js`, `/assets/*`, `/api/*`, `/migration.html`, `/robots.txt`, `/sitemap.xml`, `/llms.txt` and `/llms-full.txt` direct on every host;
- upgrades plaintext requests on the three approved hosts to HTTPS in one hop, so `http://www.popuploom.com/studio.html` goes straight to `https://popuploom.com/studio.html` and API/runtime requests are upgraded without crossing hosts;
- returns real 404s for unknown paths;
- never sends localhost/test hosts to production.

The Worker reads the visitor scheme from `cf-visitor` (falling back to `x-forwarded-proto` and then the request URL), so the upgrade is enforced in code even if the zone-level **Always Use HTTPS** setting is off. The Express server applies the same rule only when a trusted proxy reports `x-forwarded-proto: http`; local HTTP development is never redirected. Tests cover plaintext upgrades, single-hop targets, direct API/runtime paths and the localhost exemption.

Because the Worker receives the request URL after routing, Custom Domain requests arrive as `https://popuploom.com/...` and are handled correctly without trusting a user-supplied Host header.

The Content Security Policy allowlists `https://static.cloudflareinsights.com` for scripts and `https://cloudflareinsights.com` for connections so Cloudflare Web Analytics can post its beacon. Inline scripts remain hash-pinned; do not add `'unsafe-inline'`.

## Domain status (2026-11-02)

Canonical production origin: **https://popuploom.com**. The `www` browser pages redirect to the apex. The Worker's workers.dev address is disabled (`workers_dev = false`); only the custom domains serve the site.

The domain remains registered at GoDaddy. With owner approval, delegation changed to `aisha.ns.cloudflare.com` and `weston.ns.cloudflare.com`. Authoritative DNS records were reviewed first; DNSSEC was off and no MX records were present. The DMARC TXT and `_domainconnect` CNAME were preserved. GoDaddy parking A records and the old www CNAME were replaced with Worker-managed bindings.

Cloudflare Free zone: `a8ba7d253a7c97dd33d22504bfd5e7aa`, in the existing Gmail account. Both custom domains attach to the existing Worker, use issued TLS certificates, and are declared with the exact zone ID in `wrangler.toml`.

The first rebranded GitHub deployment passed all tests, custom-domain publishing and live health checks: https://github.com/Shailu016/popuploom/actions/runs/41374596216 . Live public pages passed desktop/mobile checks, and a third-party-origin test loaded the old and new scripts together without duplicate mounting or customer-data writes. Backup imports create copies rather than overwriting matching newer drafts.

## Live deployment record

Owner: shailu3597@gmail.com. Database ID: `eefbbb0c-aabb-4b08-b596-f0cf53aadc88`. Worker service: the `name` in `wrangler.toml`. The encrypted `JWT_SECRET` is stored in Cloudflare and is not committed. No paid upgrade or domain purchase was enabled by this migration. Free-tier quotas apply; billing subscriptions were not readable with the deployment OAuth scopes.

The former hyperzod-account public site and previews were disabled at the owner's request; its database was preserved. Local databases were not imported or modified. Production uses a fresh database.

Live HTTPS, crawl files, metadata and public SEO routes are responding on the legacy host. To publish updates use `npm run deploy:cf` or push to `main`. Google sign-in needs a configured OAuth client and authorized origin; none is configured currently. See `SEO.md` for indexing and webmaster verification steps.

## Domain redirects

The shared policy (`shared/host-policy.js`) moves `www` browser pages to the apex and upgrades plaintext requests in one hop. API, runtime, asset, crawler and password-reset paths are never redirected. Cached permanent redirects cannot be undone, so keep the apex operational during any rollback.
