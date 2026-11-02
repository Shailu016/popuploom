# Cloudflare deployment

Use Node 22.13+ and `npm ci`. Run `npm run test:cf`, `npm run test:cf:integration`, and `npm test`.

The build copies only frontend files and assets into `.cf-build/public` and regenerates CSP hashes. `wrangler deploy` also runs this build. The build copies `popuploom.js` byte-for-byte to `popforge.js` so the legacy script path cannot drift. Private exports, `.dev.vars`, `.wrangler` state and recovered backups are ignored by Git.

Before deployment create or select a D1 database, put its real `database_id` into `wrangler.toml`, configure `JWT_SECRET` with `wrangler secret put JWT_SECRET`, and configure `GOOGLE_CLIENT_ID` if needed. `JWT_SECRET` must be unique and at least 32 characters. It is required in every Worker environment; for local development use an ignored `.dev.vars` file. `npm run deploy:cf` rejects the placeholder database ID. No production resources are created by the tests.

Apply schema migrations with `wrangler d1 migrations apply popforge --remote` after selecting the correct database. Schema migrations contain no customer data. For a fresh import only, `npm run db:export` reads the source database without changing passwords and writes `private-data/snapshot.sql`. Existing files are never overwritten; choose `EXPORT_PATH` for another snapshot. Import explicitly with `wrangler d1 execute popforge --remote --file private-data/snapshot.sql` only into the intended empty destination. Keep backups private. The earlier generated snapshot is preserved as `private-data/0002_data.original.sql` and is not applied automatically.

Legacy bcrypt passwords remain valid and upgrade to PBKDF2 after successful login. Legacy bcrypt verification uses JavaScript CPU; validate CPU usage on the chosen Cloudflare plan before migrating production traffic (a paid Worker plan may be required). New passwords use WebCrypto PBKDF2.

Rate counters use atomic D1 upserts shared across isolates with hashed IP keys and periodic expiry cleanup. These produce D1 writes and are not a substitute for edge protection against large distributed attacks. Config reads use no-store and D1 directly to avoid per-location cache invalidation problems. Review D1 usage and production traffic capacity before launch.

The integration suite runs the actual Wrangler bundle using an isolated SQLite-backed D1 adapter and local HTTP bridge; it does not emulate every Cloudflare runtime/CPU constraint. A live Cloudflare/D1 smoke test and real Google sign-in still need validation after configuration. Existing production data is never used by the suites.

## Host policy

`shared/host-policy.js` is imported by both `worker/index.js` and `server/index.js`. It:

- treats `https://popuploom.com` as the canonical apex;
- redirects `www.popuploom.com` browser pages to the same apex path and query;
- redirects only known browser pages from the former `workers.dev` host;
- leaves `/popuploom.js`, `/popforge.js`, `/assets/*`, `/api/*`, `/migration.html`, `/robots.txt` and `/sitemap.xml` direct on every host;
- returns real 404s for unknown paths;
- never sends localhost/test hosts to production.

Because the Worker receives the request URL after routing, Custom Domain requests arrive as `https://popuploom.com/...` and are handled correctly without trusting a user-supplied Host header.

## Domain status (2026-11-02)

Canonical production origin: **https://popuploom.com**. The `www` browser pages redirect to the apex. The former **https://popforge.shailu3597.workers.dev** origin remains enabled for installed embeds, API clients and guest-draft recovery at `/migration.html`.

The domain remains registered at GoDaddy. With owner approval, delegation changed to `aisha.ns.cloudflare.com` and `weston.ns.cloudflare.com`. Authoritative DNS records were reviewed first; DNSSEC was off and no MX records were present. The DMARC TXT and `_domainconnect` CNAME were preserved. GoDaddy parking A records and the old www CNAME were replaced with Worker-managed bindings.

Cloudflare Free zone: `a8ba7d253a7c97dd33d22504bfd5e7aa`, in the existing Gmail account. Both custom domains attach to the existing `popforge` Worker, use issued TLS certificates, and are declared with the exact zone ID in `wrangler.toml`. Keep `workers_dev = true` for compatibility.

The first rebranded GitHub deployment passed all tests, custom-domain publishing and live health checks: https://github.com/Shailu016/popforge/actions/runs/41374596216 . Live public pages passed desktop/mobile checks, and a third-party-origin test loaded the old and new scripts together without duplicate mounting or customer-data writes. Backup imports create copies rather than overwriting matching newer drafts.

## Live deployment record

Owner: shailu3597@gmail.com. Database ID: `eefbbb0c-aabb-4b08-b596-f0cf53aadc88`. Worker service: `popforge`. The encrypted `JWT_SECRET` is stored in Cloudflare and is not committed. No paid upgrade or domain purchase was enabled by this migration. Free-tier quotas apply; billing subscriptions were not readable with the deployment OAuth scopes.

The former hyperzod-account public site and previews were disabled at the owner's request; its database was preserved. Local databases were not imported or modified. Production uses a fresh database.

Live HTTPS, crawl files, metadata and public SEO routes are responding on the legacy host. To publish updates use `npm run deploy:cf` or push to `main`. Google sign-in needs a configured OAuth client and authorized origin; none is configured currently. See `SEO.md` for indexing and webmaster verification steps.

## Domain redirect safety gate

The shared policy defaults to disabled when `DOMAIN_CUTOVER_ENABLED` is absent or not exactly `true`. Production now explicitly enables it after domain, HTTPS and live embed checks passed. `.env.example` stays disabled for local/self-hosted copies.

Set the production flag to `"false"` to stop future legacy-page redirects if necessary. Old/new runtime paths, API requests and the recovery page always remain direct. Cached permanent redirects cannot be undone by this flag: keep the new domain operational during rollback. Do not restore an old database snapshot over live customer writes.
