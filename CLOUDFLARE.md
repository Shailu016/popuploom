# Cloudflare deployment

Use Node 22.13+ and npm ci. Run npm run test:cf, npm run test:cf:integration, and npm test.

The build copies only frontend files and assets into .cf-build/public and regenerates CSP hashes. wrangler deploy also runs this build. Private exports, .dev.vars, .wrangler state and recovered backups are ignored by Git.

Before deployment create or select a D1 database, put its real database_id into wrangler.toml, configure JWT_SECRET with wrangler secret put JWT_SECRET, and configure GOOGLE_CLIENT_ID if needed. JWT_SECRET must be unique and at least 32 characters. It is required in every Worker environment; for local development use an ignored .dev.vars file. npm run deploy:cf rejects the placeholder database ID. No production resources are created by the tests.

Apply schema migrations with wrangler d1 migrations apply popforge --remote after selecting the correct database. Schema migrations contain no customer data. For a fresh import only, npm run db:export reads the source database without changing passwords and writes private-data/snapshot.sql. Existing files are never overwritten; choose EXPORT_PATH for another snapshot. Import explicitly with wrangler d1 execute popforge --remote --file private-data/snapshot.sql only into the intended empty destination. Keep backups private. The earlier generated snapshot is preserved as private-data/0002_data.original.sql and is not applied automatically.

Legacy bcrypt passwords remain valid and upgrade to PBKDF2 after successful login. Legacy bcrypt verification uses JavaScript CPU; validate CPU usage on the chosen Cloudflare plan before migrating production traffic (a paid Worker plan may be required). New passwords use WebCrypto PBKDF2.

Rate counters use atomic D1 upserts shared across isolates with hashed IP keys and periodic expiry cleanup. These produce D1 writes and are not a substitute for edge protection against large distributed attacks. Config reads use no-store and D1 directly to avoid per-location cache invalidation problems. Review D1 usage and production traffic capacity before launch.

The integration suite runs the actual Wrangler bundle using an isolated SQLite-backed D1 adapter and local HTTP bridge; it does not emulate every Cloudflare runtime/CPU constraint. A live Cloudflare/D1 smoke test and real Google sign-in still need validation after configuration. Existing production data is never used by the suites.
