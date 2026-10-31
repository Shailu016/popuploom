# PopForge review and fixes

Reviewed: 2026-11-01

All reproduced findings from the two reviews and follow-up failure-path checks have been addressed. This records the tested scope; it is not a claim that software can be guaranteed defect-free.

## Changes

- Serve only explicitly public frontend files and assets; encoded paths cannot expose the database, environment, or server source.
- Require a production JWT secret, reject known placeholders, constrain signing algorithms, and check account/session versions on authenticated requests.
- Google linking requires a verified email. First linking disables the unverified password and revokes old sessions. A different Google identity cannot replace an existing linked identity by matching its email.
- Ignore forwarded IP headers by default; TRUST_PROXY explicitly configures trusted reverse proxies. Rate-limit credential and lead submission requests with bounded counters.
- Validate widget configs, names, form fields and lead payloads before database changes. Return JSON for API errors.
- Propagate cloud failures instead of falling back to guest state; failed reads cannot silently create replacement widgets. Failed deletes no longer report success.
- Publish installation code only after a successful save. Guard concurrent saves and clear published state after deletion.
- Escape rendered content and attributes; restrict URL protocols, field types, corner classes and theme colors. Sanitize imported dashboard fields.
- Use explicit test mode for studio and demo popups, without recording test leads or analytics.
- Preserve form inputs and the selected spin prize on failures. Bound network requests and use idempotency keys so retrying a lost response cannot duplicate the same lead.
- Handle popup closure while a lead request is pending without an uncaught error.
- Correct page path matching, weekly frequency, zero-delay timers, selector validation, scroll listener cleanup, sticky reopening and social-proof interval units.
- Avoid duplicate runtime initialization and keep per-widget API overrides isolated.
- Destroy old preview timers/listeners. Fetch cloud submission counts without downloading every lead into the dashboard; sort saved dates correctly.
- Require Node 22.13+ so node:sqlite is available without an experimental launch flag.

## Validation

Run npm test from this folder. The permanent suite is tests/regression.test.cjs.

Latest result: 14 test groups passed, 0 failed, 0 skipped. Real headless Chrome was used for the browser group.

Coverage includes private-file requests with encoded paths; owner isolation; valid/invalid configs; JSON errors; JWT secrets; Google credential/session replacement; spoofed forwarded addresses; retry deduplication; failed cloud operations; legacy database migration; unsafe imports/rendering; popup closure during submission; API override isolation; every template's schema and preview; opening all 45 templates in the studio; failed and successful saves; installation config retrieval; test-mode approval; deletion; sticky reopening; duplicate scans; invalid selectors; proof timing; and studio layouts at 390, 768 and 1440 pixels.

All application JavaScript and inline HTML scripts passed syntax parsing. npm audit reported 0 known vulnerabilities across production and development dependencies.

Tests used temporary databases and a temporary browser profile. The project's existing database was not opened or modified by the test suite.

## Startup and remaining validation

Restart the server to load the changes. Startup automatically adds the session-version and lead retry-key columns/indexes while preserving existing rows. Legacy Google-linked sessions are revoked once during migration; those users sign in with Google again. Google-linked accounts now use Google sign-in rather than password login.

For reverse proxy deployment, configure TRUST_PROXY with trusted proxy IPs/subnets. Keep JWT_SECRET configured with a unique random secret of at least 32 characters.

The live Google consent/token exchange and delivery to a real external webhook receiver were not exercised. Authentication linking was tested with verified-profile fixtures. Production traffic capacity and deployment-specific TLS/proxy behavior were not load-tested.
