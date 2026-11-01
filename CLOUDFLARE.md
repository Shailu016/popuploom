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

## Domain status (2026-11-01)

Current production origin: **https://popforge.shailu3597.workers.dev** (the legacy hostname remains required for installed embeds, API clients and draft recovery).

Target canonical origin: **https://popuploom.com**.

`popuploom.com` is registered at GoDaddy and still delegates to GoDaddy nameservers. The production Cloudflare account currently has no zone for it. The existing Wrangler OAuth session has Workers/D1 scopes but not `zone:read` or DNS write, and the GitHub token is limited to Workers Scripts Edit + Account Settings Read. Domain attachment therefore cannot be completed from CI or this local session.

Owner steps before enabling Release B (identity/canonical/redirect cutover):

1. Add `popuploom.com` to the `shailu3597@gmail.com` Cloudflare account.
2. Inventory and recreate necessary DNS records (MX, SPF, DKIM, DMARC, verification) before changing nameservers at GoDaddy.
3. Wait for the Cloudflare zone to become active.
4. Add the apex and `www` as Workers Custom Domains for the existing `popforge` Worker. Keep `workers_dev = true`.
5. Deploy and verify apex HTTPS, `www` redirects, both runtime paths, `/api/health`, and old/new embeds.
6. Only then update the workflow's health target to `https://popuploom.com/api/health`.

A declarative starting point once the zone exists (top-level TOML array tables, not `[vars]`):

```toml
[[routes]]
pattern = "popuploom.com"
custom_domain = true

[[routes]]
pattern = "www.popuploom.com"
custom_domain = true
```

Do not add routes before the zone is active: Wrangler will fail, and guessed DNS targets are unsafe.

## Live deployment record

Owner: shailu3597@gmail.com. Database ID: `eefbbb0c-aabb-4b08-b596-f0cf53aadc88`. Worker service: `popforge`. The encrypted `JWT_SECRET` is stored in Cloudflare and is not committed. No paid upgrade or domain purchase was enabled by this migration. Free-tier quotas apply; billing subscriptions were not readable with the deployment OAuth scopes.

The former hyperzod-account public site and previews were disabled at the owner's request; its database was preserved. Local databases were not imported or modified. Production uses a fresh database.

Live HTTPS, crawl files, metadata and public SEO routes are responding on the legacy host. To publish updates use `npm run deploy:cf` or push to `main`. Google sign-in needs a configured OAuth client and authorized origin; none is configured currently. See `SEO.md` for indexing and webmaster verification steps.

## Domain redirect safety gate

`DOMAIN_CUTOVER_ENABLED` defaults to `"false"` in Wrangler and `.env.example`. When absent or disabled, legacy browser pages stay on the working workers.dev origin; `/index.html` only normalizes on that same origin. Both runtimes and all API paths remain direct.

Only set `DOMAIN_CUTOVER_ENABLED = "true"` after apex DNS, valid HTTPS, application pages, sign-in, and external embeds have been verified. Keep it false while domain setup is blocked. The rebrand source metadata already targets the apex, so the entire rebrand is still a staged release: do not publish it merely because redirect tests pass. Complete or deliberately defer the canonical metadata cutover before releasing. Existing permanent redirects cached by clients cannot be undone by this flag; keep the target domain reachable if cutover was previously enabled.
