# Security test results

Updated: 2026-11-07
Commit: `1cad808` plus direct Cloudflare DNS changes.

## Automated suites

| Command | Result |
| --- | --- |
| `npm test` | 52 passed, 0 failed, 0 skipped |
| `npm run test:cf` | 14 passed, 0 failed |
| `npm run test:cf:integration` | 116 passed, 0 failed |
| `npm run security:scan` | no credential-shaped strings in tracked files |
| `npm audit` | 0 vulnerabilities |

The regression suite covers, among other things:

- cross-account lead/widget access;
- static-file allowlist and encoded traversal attempts;
- CSP hash generation and line-ending normalization;
- origin rejection on private APIs;
- oversized, compressed and deeply nested bodies;
- rate-limit spoofing via forwarded headers;
- reset-token hashing, expiry, single use and session revocation;
- hostile popup config rendering (placement, theme, URL, field type);
- CSV formula injection;
- webhook signing, retries, idempotency and private-address rejection;
- webhook DNS bypass (`nip.io`, `sslip.io`, `localtest.me`);
- explicit account deletion of submissions/widgets.

## Live checks

| Check | Result |
| --- | --- |
| `https://popuploom.com/security.html` | 200, CSP present |
| Lighthouse on `/security.html` | Accessibility 100, Best Practices 100, SEO 100 |
| `https://popuploom.com/embed/1.1.0/popuploom.js` | 200, `public, max-age=31536000, immutable` |
| `/embed/1.1.0/SHA256SUMS` | 200; matches served bytes |
| Served embed hash | `633468cef2cb8837dce749d0c9673d74b23f6dae299037998436304a3129d017` |
| `/embed/1.1.0/popuploom.js` version marker | `Runtime.version = "1.1.0"` |
| `security.txt` | `Policy` points to `/security.html` |
| Homepage | no `workers.dev` migration link, no ad script |
| `sitemap.xml` | includes `/security.html` |
| DNS SPF | `v=spf1 include:_spf.mx.cloudflare.net ~all` at apex (Email Routing); `send.popuploom.com` SPF remains |
| Email Routing | MX active; `security@` and `support@` forward to a verified destination |
| DNS CAA | issue/issuewild for Google Trust Services, Let's Encrypt, DigiCert, Sectigo; iodef set |
| DMARC | `p=quarantine`, aggregate reports |
| RDAP | registration 2026-11-01, expiry 2027-11-01, transfer lock |
| Google Search Console | Security issues: none; Manual actions: none |

## Reputation checks

- Gridinsoft: phishing, 1/100, one external provider attributed to SOCRadar.
- URLScan: 8 studio scans, user tags `possiblethreat,phishing`, no labels/verdict; one scan is `tpl=blank`.
- Google Safe Browsing transparency endpoint: no unsafe-content flags returned.
- VirusTotal: HTTP 429 at audit time; not verified.
- SOCRadar portal: not available without an account.

## Not tested

- Full penetration test / ASVS assessment.
- Sustained load, distributed abuse or DDoS.
- Live Google token exchange.
- A real third-party webhook receiver in production.
- D1 backup restore.
- DNS rebinding race against the production HTTP client.

## Interpretation

Passing tests do not prove the absence of vulnerabilities. They show that the documented controls behave as expected at this commit.
