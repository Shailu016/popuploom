# Cloudflare Security Insights — 2026-11-13

Source: `Cloudflare_Shailu3597@gmail.com's Account_SecurityInsights_20261113_2043.csv`
(5 active findings, 2 domains/subjects).

| Severity | Finding | Verdict | Action |
|---|---|---|---|
| Moderate | Admin user without MFA | **Real and highest priority** | Enable 2FA now |
| Moderate | Bot Fight Mode not enabled | **Do not enable globally** | Use Turnstile + rate limits instead |
| Low | `security.txt` not configured | **False positive** | Root compatibility copy added; rescan |
| Low | Precursor not enabled | Not applicable on this plan | Skip |
| Low | AI Labyrinth not enabled | **Conflicts with strategy** | Do not enable |

## 1. MFA — do this first

`shailu3597@gmail.com` is the only administrative user and has no MFA. That account
controls:

- DNS for `popuploom.com`
- the Worker and its secrets (`JWT_SECRET`, `RESEND_API_KEY`)
- the D1 database with accounts, popups and captured leads
- Email Routing and the domain registration

A password-only account is the single largest takeover risk in the stack. Use a TOTP
app (not SMS) and store the backup codes offline. After enabling it for the owner,
turn on **Require 2FA** for members so a future invite cannot bypass it.

This is an owner-only action: it needs the authenticator device.

## 2. Bot Fight Mode — do not enable

Bot Fight Mode is a zone-wide, non-tunable challenge on the Free plan. PopupLoom's
architecture depends on cross-origin, non-browser requests from customer websites:

- `GET /api/widgets/{id}/config`
- `POST /api/widgets/{id}/view`
- `POST /api/widgets/{id}/submit`

Those requests come from arbitrary customer domains, not from `popuploom.com`.
A challenge there breaks popups and lead capture on sites you do not control. The
same applies to AdSense/CMP beacons and to API clients that are not browsers.

Current protections are application-level and targeted:

- per-IP rate limits on view, submit, login, register and reset
- request-size limits and shape validation
- CORS/origin policy for owner endpoints
- email verification and enumeration-safe auth

The better next step is **Turnstile** on signup and lead forms plus a narrow WAF rate
rule, not a global bot challenge. Revisit Bot Fight Mode only with a staging zone and
a test matrix covering all three public widget endpoints.

## 3. `security.txt` — false positive, compatibility fixed

The canonical file already exists and is valid:

```
https://popuploom.com/.well-known/security.txt
Contact: mailto:security@popuploom.com
Expires: 2027-11-01T00:00:00.000Z
Canonical: https://popuploom.com/.well-known/security.txt
Policy: https://popuploom.com/security.html
```

Cloudflare's check appears to look at the legacy root path. A byte-identical copy is
now served at `https://popuploom.com/security.txt`; the `Canonical` field keeps the
RFC 9116 well-known URL authoritative. Re-run the insight after the next scan; it
should clear without disabling the file.

## 4. Precursor — skip

Precursor is a session-level bot verification product. It is not part of the Free
toolset and there is no observed session-fraud signal on this site. Adding a paid
control before Turnstile and MFA would be backwards.

## 5. AI Labyrinth — do not enable

AI Labyrinth adds hidden, AI-generated nofollow links to trap crawlers that ignore
robots rules. That directly conflicts with the work just shipped:

- `llms.txt` and `llms-full.txt`
- Link headers, API catalog, ARD manifest
- Content Signals with `ai-input=yes`
- Markdown negotiation for agents

The strategy is to be readable and citable by AI systems, not to tarpit them. Enabling
Labyrinth would also make crawler behaviour harder to debug.

## Rescan checklist

- [x] Root `security.txt` compatibility copy deployed
- [ ] MFA enabled on the Cloudflare owner account (owner)
- [ ] Require 2FA for members (owner, after the first)
- [ ] Re-run Security Insights after 24–48h and confirm the `security.txt` finding clears
- [ ] Keep Bot Fight Mode, Precursor and AI Labyrinth off until there is evidence they are needed
