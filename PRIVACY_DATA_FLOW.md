# Privacy data flow

Updated: 2026-11-07

This is an engineering map of what the current code stores and where. It supplements, and must remain consistent with, `privacy.html`.

## Actors

- **Owner:** creates an account, saves popups and reads leads.
- **Visitor:** sees a popup on a customer site and may submit a form.
- **Customer site:** the third-party page that loads `popuploom.js`.

## Data map

| Data | Collected when | Stored where | Access | Retention |
| --- | --- | --- | --- | --- |
| Account email | Registration or Google sign-in | D1/SQLite `users.email` | Owner, authenticated API | Until account deletion |
| Password hash | Registration or password change | `users.password_hash` | Never returned | Until password change/account deletion |
| Google subject/avatar/name | Google sign-in | `users.google_id`, `avatar_url`, `name` | Owner profile | Until account deletion |
| Popup configuration | Save/publish | `widgets.config` | Owner; public `/config` for presentational fields | Until popup/account deletion |
| View count | Popup view | `widgets.view_count` | Owner dashboard | Until popup deletion |
| Lead responses | Form submission | `submissions.data` | Owner through authenticated inbox/CSV | Until popup/account deletion |
| Browser webhook URL | Owner configuration | Public `widgets.config` | Anyone who can read the public config | Until popup change/deletion |
| Server webhook URL + secret | Owner configuration | `webhook_endpoints` | Owner only | Until webhook/popup/account deletion |
| Webhook delivery log | Delivery attempt | `webhook_deliveries` | Owner only | Newest 100 per widget |
| Session token | Sign-in | Browser `localStorage` (`pf.token`) | Page JavaScript | 30 days or revocation |
| Revoked token hash | Logout | `revoked_tokens` | Server | Until token expiry |
| Password reset token | Forgot-password | Only SHA-256 hash in `password_reset_tokens` | Server | 30 minutes; cleared/used |
| Rate-limit counters | API requests | `rate_limits` | Server | Short window; expired rows cleaned |
| Guest drafts | Guest studio use | Browser `localStorage` (`pf.widgets`) | Page JavaScript | Until cleared/migrated |
| Popup view/dismiss state | Popup shown | Browser `localStorage` (`pf.*`, `pfview.*`) | Page JavaScript | Until cleared |
| Legacy lead cache | Older runtime | Browser `localStorage` (`pfsubs.*`) | Page JavaScript | Removed on next runtime load |

## Flow: popup view

1. `popuploom.js` loads.
2. It fetches `/api/widgets/<id>/config` (public, presentational).
3. It evaluates page/device/frequency rules.
4. It renders the popup in the host DOM.
5. It may POST `/api/widgets/<id>/view`; the server increments a counter.

No host cookies or unrelated host fields are read.

## Flow: lead submission

1. Visitor submits the configured form.
2. Runtime POSTs `{ data, requestId }` to `/api/widgets/<id>/submit`.
3. Server checks the widget exists, validates object shape/size, and inserts into `submissions`.
4. The duplicate request id makes retries idempotent.
5. Server-side webhook delivery runs after storage via `ctx.waitUntil`/fire-and-forget.
6. The owner reads the response through the authenticated lead inbox.
7. The runtime does **not** write the response to host `localStorage`.

## Third parties

| Provider | Role | Data |
| --- | --- | --- |
| Cloudflare | Workers, D1, DNS, CDN | Hosted application and database data |
| Google | Identity Services (when configured) | Verified identity token |
| Resend | Password-reset email | Recipient address, reset link |
| Customer's own webhook | Owner integration | Lead payload, signed |
| Google Fonts | Font delivery | Visitor IP/request metadata |

Advertising is disabled. If enabled later, the existing gate requires AdSense approval, a real slot and Google Privacy & messaging; no ad script loads now.

## Deletion

- Deleting a widget removes its submissions, webhook deliveries and endpoint explicitly.
- Deleting an account removes its submissions, webhook deliveries, endpoints, widgets, reset tokens and user row explicitly.
- Revoked-session records expire with their token.
- Backups may outlive deletion for the provider's backup window.
- Browser storage is controlled by the visitor/browser, not the server.

## Open privacy work

- Scheduled retention cleanup and a documented backup retention period.
- Domain-based privacy/security contact aliases.
- Per-owner disclosure text for popup forms (the owner supplies consent language).
- A data-processing agreement template for business customers, if needed.
