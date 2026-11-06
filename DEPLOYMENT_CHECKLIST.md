# Deployment checklist

Updated: 2026-11-07

Use this before and after every production deployment.

## Before merge

- [ ] `npm ci` installs the lockfile without errors.
- [ ] `npm test` passes.
- [ ] `npm run test:cf` passes.
- [ ] `npm run test:cf:integration` passes.
- [ ] `npm audit --omit=dev --audit-level=high` passes.
- [ ] `npm run security:scan` passes.
- [ ] No `.env`, database, private snapshot or verification token is staged.
- [ ] CSP hashes regenerated after any inline-script or event-handler change:
  `node scripts/csp-hashes.js`
- [ ] New public pages added to:
  - `scripts/build-cf.cjs`
  - `worker/index.js` `PUBLIC_FILES`
  - `server/index.js` `publicFiles`
  - `server/security.js` `htmlFiles`
  - `scripts/csp-hashes.js` `htmlFiles`
  - `sitemap.xml`
  - regression tests
- [ ] Security-sensitive changes reviewed by a human.

## Production secrets

- [ ] `JWT_SECRET` is a unique random value of at least 32 characters.
- [ ] `RESEND_API_KEY` is set as a Worker secret, not in source.
- [ ] `RESET_EMAIL_FROM` uses the verified domain.
- [ ] `PUBLIC_ORIGIN=https://popuploom.com`.
- [ ] `ALLOW_INSECURE_WEBHOOKS` is not `true`.
- [ ] `ADSENSE_ENABLED=false` until approval, CMP and a real slot are verified.
- [ ] Cloudflare API token is stored only in GitHub secrets.

## Database

- [ ] D1 migrations applied for any new table/column.
- [ ] No destructive migration without a backup and restore plan.
- [ ] New deletion path tested on a staging/temp database.
- [ ] Backup restore tested at least once per quarter.

## Deployment

- [ ] Push to `main` (or run the workflow manually).
- [ ] `production` environment approval is configured in GitHub if required.
- [ ] Workflow completes successfully.
- [ ] Live health check passes:
  `curl -fsS https://popuploom.com/api/health`
- [ ] Legacy and current runtime bytes match:
  `/popforge.js` and `/popuploom.js`.
- [ ] `/embed/1.1.0/popuploom.js` returns 200 with immutable cache.
- [ ] `/embed/1.1.0/SHA256SUMS` matches the served bytes.
- [ ] `/security.html`, `/faq.html`, `/press.html` return 200.
- [ ] No ad script is present while ads are disabled.
- [ ] `npm run indexnow` submits the sitemap URLs (HTTP 202).
- [ ] `security@popuploom.com` and `support@popuploom.com` resolve through Email Routing.
- [ ] Apex SPF remains a single record; DNS CAA records remain present.

## Headers

- [ ] HTML has CSP, HSTS, `X-Frame-Options: DENY`, `nosniff`, referrer and permissions policy.
- [ ] 404 keeps the hardened CSP.
- [ ] API responses are `no-store`.
- [ ] Versioned embed is immutable.

## After deployment

- [ ] Google Search Console URL Inspection / indexing requested for changed pages.
- [ ] Bing Webmaster sitemap processing checked.
- [ ] Uptime/error monitor green (when configured).
- [ ] Deployed script hash matches the release record.
- [ ] No new provider warning appears within 24 hours.
- [ ] Record the commit, run ID, embed hash and any DNS changes.

## Rollback

1. Revert the offending commit and redeploy.
2. If the embed changed, publish a new version path; do not overwrite an existing immutable version.
3. If a secret leaked, rotate it before rolling back.
4. If DNS changed, restore the previous records from the audit log.
5. Do not restore a database backup over newer user data without confirming the data-loss window.

## Current deployment record

- Commit: `1cad808`
- Deploy run: `42271385281` — success
- Security page: live
- Embed version: `1.1.0`
- Embed SHA-256: `633468cef2cb8837dce749d0c9673d74b23f6dae299037998436304a3129d017`
- IndexNow: 18 URLs accepted (HTTP 202)
- Ads: disabled
