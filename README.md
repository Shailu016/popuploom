# PopupLoom

Free website popup builder with a visual editor, popup templates, hosted embeds, and lead capture. Vanilla frontend (no build step) plus a small Node backend (Express + SQLite) for accounts, cloud saves, and lead/view tallies.

Canonical site: **https://popuploom.com/**

> The private repository, project folder, Worker service, D1 database and CI token keep their original `popforge` names. Those are infrastructure identifiers, not visible branding. Keeping them preserves existing deployments and data.

---

## Files

| File | What it is |
|---|---|
| `index.html` | Landing page + template gallery (45 live mini-previews, category filters) + My popups shelf/dashboard |
| `studio.html` + `studio.js` | The editor ("studio"): Content / Design / Behavior / Publish tabs with live preview |
| `popuploom.js` | The runtime. The drop-in embed engine your visitors paste onto their sites. Canonical source, also served as `/popforge.js` through a byte-for-byte alias |
| `app.js` | Shared code: API-aware storage, auth, the template catalog (original designs), helpers |
| `migration.html` | Noindex recovery page on the former host for guest drafts saved in `localStorage` |
| `reset-password.html` + `reset-password.js` | Noindex password reset page: request a link, then set a new password from a single-use URL fragment token |
| `assets/` | Original template imagery, PopupLoom wordmark/mark and favicons, and `og-popuploom.png` |
| `ui.css` | Studio/landing theme ("Refined Ember on Graphite") |
| `demo.html` | Fake storefront with five popups armed (age gate, spin wheel, flash deal, social proof, video), for end-to-end testing |
| `server/` | Express API: auth (JWT + bcrypt + Google ID-token verification), widget CRUD, live public config, view tallies, lead submissions; SQLite via `node:sqlite` |
| `shared/host-policy.js` | Single source of truth for canonical-host and legacy-page redirects, used by both Express and the Worker |
| `worker/` | Cloudflare Worker port of the API, static allowlist, security headers and host policy |
| `package.json` | Backend deps + start scripts (`bcryptjs`, `cors`, `express`, `jsonwebtoken`, `google-auth-library`) |
| `.env.example` | Template for `PORT`, `JWT_SECRET`, `GOOGLE_CLIENT_ID` |

## Run it

```bash
cd popforge
npm install
npm start
# → http://localhost:3000   (API: /api, DB: popforge.db)
```

Requires Node 22.13+ (built and tested on Node 24). The server uses `node:sqlite`, `process.loadEnvFile`, and `fetch`. The database file is created automatically on first boot. Copy `.env.example` to `.env` first if you want Google sign-in or a production secret.

| Env var | Default | Purpose |
|---|---|---|
| `PORT` | `3000` | HTTP port |
| `DB_PATH` | `<project>/popforge.db` | SQLite file location |
| `JWT_SECRET` | random per-process development secret | Required in production; use a unique random secret of at least 32 characters. Signs 30-day login tokens |
| `GOOGLE_CLIENT_ID` | empty | Enables Sign in with Google. Empty = the Google button is hidden and `/api/auth/google` answers 503 |
| `RESEND_API_KEY` | empty | Resend API key used to send password reset links. Empty = reset email stays disabled with a clear 503 setup message |
| `RESET_EMAIL_FROM` | empty | Verified sender, e.g. `PopupLoom <reset@popuploom.com>` |
| `PUBLIC_ORIGIN` | `http://localhost:PORT` locally, `https://popuploom.com` in production | Origin used to build the reset link. Must be HTTPS outside local development |

Example production start:

```bash
JWT_SECRET="$(openssl rand -hex 32)" PORT=8080 npm start
```

## Accounts, installation and Google sign-in

Installation is account-gated. Anyone can open the studio, design a popup, and preview it, but the install code is issued only for a popup saved to a real account. Guest drafts live in `localStorage` and are moved into the account on sign-in.

Every saved widget gets its own id (`wan_…`) and its own install code:

```html
<!-- PopupLoom: paste once, before </body> -->
<div data-popuploom="wan_your_widget_id"></div>
<script src="https://popuploom.com/popuploom.js"></script>
```

The snippet carries only the id. `popuploom.js` fetches the live config from `GET /api/widgets/:id/config` when the page loads, so saving in the studio updates every installed copy without re-pasting. Old inline base64 snippets still work.

### Compatibility with existing installs

The previous brand shipped `<div data-popforge="…"></div>` and `/popforge.js`. Both continue to work:

- `/popforge.js` is the same runtime bytes as `/popuploom.js`; neither path redirects across domains.
- The runtime accepts `data-popuploom` and `data-popforge`. If a node carries both, `data-popuploom` wins and only one popup is mounted.
- `data-popforge-ready` / `data-popuploom-ready` are both written as mount markers, so repeated scans stay idempotent.
- `window.PopupLoom` and `window.PopForge` are the same object, exposing `show`, `preview`, `scan`, `encodeCfg`, `version`, `API`, `snippet` and the instance registry.
- Existing analytics contracts are unchanged: `popforge:*` window events and `popforge_*` `dataLayer` pushes still fire. No duplicate new-brand events are emitted.
- Storage keys (`pf.*`) and runtime CSS classes (`.pf-*`) are unchanged, so saved drafts, tokens and frequency state keep working on the same origin.

API base precedence is: per-widget `data-api` attribute → `window.POPUPLOOM_API` → legacy `window.POPFORGE_API` → the origin that served the executing script. The script origin is captured from `document.currentScript`, so both filenames work even when the tag is moved or injected.

### Moving from the former host

`localStorage` is scoped by origin, so guest drafts on the old `workers.dev` host do not appear automatically on `popuploom.com`. Account-owned popups, submissions and widget configs are in D1 and remain available after signing in on the new domain.

For guest drafts, `/migration.html` stays reachable on the old host. It reads the existing `pf.widgets` key, validates entries, lists them, and downloads `popuploom-widgets-backup.json` in the established import format. It never uploads, clears or overwrites drafts. The same origin contains the import UI under **My popups**.

### Set up Google sign-in (one-time, ~5 minutes)

Google Identity Services needs a client id. No client secret is used: the server verifies the signed ID token against the client id.

1. Open [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials) and create (or pick) a project.
2. Configure the **OAuth consent screen** (External): app name `PopupLoom`, your support email, and the `openid`, `email`, `profile` scopes. While the app is in **Testing**, add your own Google address under **Test users**.
3. **Create credentials → OAuth client ID → Web application.**
4. Under **Authorized JavaScript origins** add:
   - `http://localhost:3000` for local development
   - `https://popuploom.com` and, if used, `https://popforge.shailu3597.workers.dev` while old sessions remain
   Do **not** add a redirect URI; the button flow does not use one.
5. Copy the **Client ID** (ends in `.apps.googleusercontent.com`).
6. Create `.env` next to `package.json`:
   ```bash
   GOOGLE_CLIENT_ID=1234567890-abc123.apps.googleusercontent.com
   JWT_SECRET=<a long random string>
   ```
7. Restart the server. The console prints `Google sign-in: enabled`, and the Google button appears in the sign-in modal.

Notes:
- GIS only works on `http://localhost` or HTTPS origins. A plain `http://192.168.x.x:3000` will not render the button.
- Automatic Google linking requires Gmail or a verified Workspace hosted-domain claim. On first linking, the old unverified password is disabled and all previous sessions are revoked. Existing password accounts using other email providers must sign in with email/password. Already-linked accounts use the stable Google identity.
- Google-linked accounts use Google sign-in; password login is disabled for them.
- To verify the backend path without Google, `POST /api/auth/google` returns `503 { code: "GOOGLE_NOT_CONFIGURED" }` when `GOOGLE_CLIENT_ID` is unset.

### API surface

| Method + path | Auth | What it does |
|---|---|---|
| `POST /api/auth/register` | None | Create account, returns `{ user, token }` |
| `POST /api/auth/login` | None | Sign in, returns `{ user, token }` |
| `POST /api/auth/forgot-password` | None | Request a single-use reset link. Always the same generic response for unknown, Google-only and existing accounts |
| `POST /api/auth/reset-password` | None | Consume a reset token and set a new password; revokes existing sessions |
| `POST /api/auth/google` | None | Exchange a Google ID token for `{ user, token }` |
| `GET /api/auth/config` | None | `{ googleClientId }` (or `null`) for the browser button |
| `POST /api/auth/logout` | Bearer | Revoke the current session token |
| `GET /api/auth/me` | Bearer | Current user (name + avatar when Google-linked) |
| `GET /api/widgets` | Bearer | List the user's widgets (with `viewCount`) |
| `POST /api/widgets` | Bearer | Create a widget |
| `GET /api/widgets/:id` | Bearer | Fetch one widget |
| `PUT /api/widgets/:id` | Bearer | Update name/config |
| `DELETE /api/widgets/:id` | Bearer | Delete widget (+ its submissions) |
| `GET /api/widgets/:id/config` | public | Live config for the embedded runtime (no owner data) |
| `GET /api/widgets/:id/submissions` | Bearer | List captured leads (default 200, max 500; use limit and before ID for pagination) |
| `POST /api/widgets/:id/view` | public | Increment view counter (called by the embed runtime) |
| `POST /api/widgets/:id/submit` | public | Store a lead (called by the embed runtime) |
| `GET /api/health` | None | Liveness check |

Public endpoints keep their permissive CORS behavior so embeds on external sites can report views and leads. Private endpoints still accept only the app origin (plus any `APP_ORIGINS` entries).

## Host and redirect policy

`shared/host-policy.js` is applied by both the Express server and the Worker:

- `https://popuploom.com` is the canonical apex. It serves pages directly.
- `https://www.popuploom.com` permanently redirects browser pages to the same apex path and query in one hop.
- The former host redirects only known browser pages (`/`, `/index.html`, templates, guide, studio, account, demo) to the apex.
- On every host, `/popuploom.js`, `/popforge.js`, `/assets/*`, `/api/*`, `/migration.html`, `/robots.txt` and `/sitemap.xml` are served directly. Installed embeds and API clients never cross a host boundary.
- Unknown paths return a real 404, never a homepage redirect.
- Localhost, `127.0.0.1` and test hosts are never redirected to production. Only same-origin `/index.html` normalization applies.

## The saved-widget lifecycle

1. Visitor opens the gallery on `index.html`, picks a build, lands in the studio
2. Guests can design and preview; drafts stay in `localStorage` and no install code is issued
3. To install, they create an account (email/password or Google). Guest drafts migrate into the account automatically
4. Save widget stores it in SQLite under their account (My popups, cloud pill)
5. Publish tab issues that widget's own install code (`<div data-popuploom="wan_…">` + `popuploom.js`), tied to the account that saved it
6. Any of their popups can be re-opened, edited, duplicated, or deleted from My popups anytime; edits sync to installed copies
7. **Export leads (.csv)** downloads every captured response across all popups, following the 500-row API pages and adding popup name/id columns; **Backup popups (.json)** writes `popuploom-widgets-backup.json` for configurations only, and Import file restores it on another machine. The JSON backup never contains lead data — use the CSV export or a popup's lead inbox for that
8. Views and saved leads are tallied per widget. The embedded runtime reports them to the API

## Runtime feature map

| Feature | Implementation |
|---|---|
| Placements | Modal (centered), fullscreen takeover, slide-in from 4 corners, top strip, bottom strip |
| Triggers | page load · on-page timer (s) · scroll depth % · scroll-past element · click an element · exit intent (desktop only) |
| Multi-trigger | Several can be armed; first to fire wins |
| Frequency | every load · once/day · once/week · once ever · "until closed, rest 24h" (5 rules, `localStorage` based) |
| Page targeting | all · include list · exclude list, each line a glob (`/shop/*`) |
| Devices | separate desktop/mobile switches; exit-intent self-disables on touch |
| Content blocks | badge · headline · body · image · video (YouTube/Vimeo, auto-embedded) · live countdown · tap-to-copy coupon · tap-meter choices · form (multi-field) · prize wheel (spin-to-win) · age gate (18+ verify) · social-proof toasts · CTA · link tiles · fine print |
| Forms | submissions stored in SQLite (owner sees counts + leads on the dashboard), optional webhook POST (`no-cors`) |
| Prize wheel | conic-gradient wheel rendered from config segments; weighted-looking stop, 4.3s ease-out spin; the landed prize is logged with the widget's leads |
| Age gate | allow passes through (logs a verified event, then auto-closes); deny shows a message or redirects to a configurable URL |
| Social proof | bottom-left corner card that cycles through configured activity items on an interval |
| Sticky button | optional pill that reopens the popup |
| Analytics | `popforge:view / open / close / submit` window events + `dataLayer` pushes when GTM exists (retained for compatibility) |
| Safety | URL/image inputs sanitized (HTML-escaped), CSS-selector errors caught, lazy render (nothing loads until summoned) |
| Animations | pop (spring) · fade · slideUp · slideDown; all opt-in |

## Embedding on a site (what end users copy)

```html
<!-- PopupLoom install. Paste once, before </body> -->
<div data-popuploom="wan_your_widget_id"></div>
<script src="https://popuploom.com/popuploom.js"></script>
```

Each account-owned widget has its own id in that `data-popuploom` attribute. The runtime resolves it against `GET /api/widgets/:id/config`, so the site never needs re-editing after a design change. The studio fills in the absolute script URL for you.

Power users can still hand-write an inline base64 config (the older format) or call `PopupLoom.show(cfg)` directly. Inline configs always start with `eyJ` and skip the network fetch; hosted ids match `/^[A-Za-z0-9_-]{3,64}$/`.

Platform notes:

- Works wherever raw HTML runs: WordPress (Custom HTML), Shopify (liquid/sections), Webflow embeds, Ghost, GitHub Pages, static sites.
- On builders that trap third-party widgets in iframes (some Wix/GoDaddy/Hostinger embeds, Google Sites, Canva), a fixed popup can't escape the frame. Install at body level where the platform allows code, or prefer the strip placements.

See [SECURITY.md](SECURITY.md) for the security review, deployment settings and public-config trust boundaries. New passwords require at least 12 characters. Set APP_ORIGINS for additional trusted frontend origins; private APIs otherwise accept only the app origin.

Run `npm test` for isolated API, auth, password-reset and browser regression checks. Browser checks use Chrome/Edge when available; the `POPFORGE_BROWSER` environment variable still overrides the executable path for compatibility. Existing project data is never used by the tests. Password-reset tests replace the Resend sender with a local stub, so they never call the provider or need an API key.

Reverse proxy deployments must set `TRUST_PROXY` to the trusted proxy IPs/subnets; forwarded headers are ignored by default.

## Config schema (v1)

```jsonc
{
  "v": 1,
  "id": "my_widget_1", "name": "My first popup", "template": "drop48",
  "placement": "modal | fullscreen | slide:br|bl|tr|tl | topbar | bottombar",
  "trigger": { "type": "load|delay|scrollPct|scrollTo|click|exitIntent",
               "delay": 6, "pct": 50, "selector": "#cta-buy" },
  "frequency": "always|once:day|once:week|once:ever|close24h",
  "pages":   { "mode": "all|include|exclude", "include": ["/shop/*"], "exclude": [] },
  "devices": { "desktop": true, "mobile": true },
  "sticky":  { "enabled": true, "label": "Sale" },
  "theme":   { "style": "light|ink", "accent": "#35F0B0", "accentText": "#06130D",
               "text": "#171A20", "bg": "#FFFFFF", "bgImage": "", "radius": 18,
               "animation": "pop|fade|slideUp|slideDown", "overlay": true },
  "content": {
    "badge": "", "title": "", "body": "", "image": "", "videoEmbed": "",
    "buttonText": "", "buttonUrl": "", "buttonStyle": "light|dark",
    "coupon": { "code": "WELCOME-10" },
    "countdown": { "target": "2026-12-31T20:00:00.000Z" },
    "choices": [ { "emoji": "😀", "label": "Great", "value": "great" } ],
    "form": { "enabled": true, "buttonLabel": "Join", "success": "Thanks!",
              "webhookUrl": "https://hooks.zapier.com/…",
              "fields": [ { "name": "email", "type": "email", "label": "Email", "required": true } ] },
    "spin": { "enabled": true, "buttonText": "SPIN",
              "segments": [ { "emoji": "🎁", "label": "10% off" } ] },
    "ageGate": { "enabled": true, "minAge": 18,
                 "allowLabel": "Yes, I'm 18 or older", "denyLabel": "No, take me back",
                 "denyUrl": "", "denyMessage": "Sorry, adults only.", "allowMessage": "Welcome in." },
    "proof": { "enabled": true, "interval": 5,
               "items": [ { "name": "Maya", "action": "unlocked 20% off", "ago": "2 min ago" } ] },
    "links": [ { "label": "Docs", "url": "https://…" } ],
    "note": ""
  }
}
```

## The template catalog (45 original builds across 6 journeys)

Gallery categories with live previews on `index.html`. Every design is original (our own imagery in `assets/`, our own copy and palettes):

- Discount: 48-Hour Drop (watch shot + countdown + code), Sticky Note Deal (mug-on-yellow coupon), Fresh Kicks Drop (sneaker shot + timer), Midnight Audio Sale (moody headphones, ink)
- Email: Last Exit Note (linen shot, exit intent), Queue Ticket (violet product teaser), Glow Ritual (skincare), Morning Club (cafe signup)
- Gamified: Spin to Win (prize bundle + wheel), Bundle Giveaway (contest + countdown)
- Seasonal: Black Friday Fortress, Winter Unwrap (Christmas), Cyber Monday Reload (neon keyboard shot)
- Age gate: Eighteen Check (18+ verification: allow / deny-message-or-redirect)
- Social proof: Proof Pulse (rotating corner toasts)
- Announce: Marquee Masthead (top bar), Free Shipping Rail (bottom bar)
- Engage: Tap Meter (mood survey), One Small Yes (micro-commitment), Corner Peek (support), Transit Card (shortcut tiles)
- Video: Screen Room
- Exit: Don't Leave Empty (fullscreen exit-intent takeover)

Plus a blank canvas start in the studio. Template images resolve from `assets/`; countdown targets in templates auto-arm to a live future time when copied.

## Intentional product differences

- Original template set, names, copy, and generated imagery throughout
- Spin-to-win as a first-class block, config-driven and one tap
- 18+ age gate as a native template + block
- CSS selectors instead of element IDs for click / scroll-past triggers
- A 5th frequency rule: "until closed, then rest 24h"
- Counts views and leads for the user's popups without a view-count paywall
- The countdown is a real live block, auto-armed from a date picker in the editor
- iframe/escape-hatch guidance ships in-product

## Roadmap ideas

- A/B rule pairs on one widget · audience rule (new vs returning) · per-country shows
- Email-provider connectors (ConvertKit/Mailchimp) on top of the existing DB + webhook capture
- Template import from JSON in the studio
- Per-widget public share links (view-only preview)

## Cloudflare deployment

See [CLOUDFLARE.md](CLOUDFLARE.md) for build, tests, D1 migration, private data imports, secrets, and deployment prerequisites. The live custom-domain bindings, legacy compatibility, rollback controls and webmaster verification steps are documented there and in [SEO.md](SEO.md).

## Lead inbox and account controls

Open **My popups → Leads** for any saved popup. The inbox shows 100 responses per page; **Export all leads as CSV** follows every 500-row API page, includes all captured fields, supports cancellation, and escapes spreadsheet formula prefixes. API ownership checks remain enforced. Empty, expired-session and request-error states are explicit. The CSV is a browser download: keep exported personal data private.

**My popups → Export leads (.csv)** downloads one combined file for the whole workspace. It includes the popup name and id on every row, pages each popup at 500 leads, escapes spreadsheet formula prefixes, and is the only bulk export that contains visitor responses. The `.json` backup beside it stores popup configurations, not leads.

Your account supports password changes and permanent account deletion after current-password verification, or a matching Google identity for Google-only account deletion. Password changes invalidate existing sessions. Account deletion cascades to saved widgets and their leads. Export before deleting.

## Password reset

**Forgot password?** on the sign-in form opens `/reset-password.html`. The request form always answers with the same generic message, whether or not the address belongs to an account. Accounts that signed up with email and password receive a Resend email containing a link of the form `https://popuploom.com/reset-password.html#token=…`.

- Tokens are 32 random bytes (256 bits), valid for **30 minutes**, and single-use.
- Only a SHA-256 hash of the token is stored, in `password_reset_tokens` (user id, email, created/expiry/used timestamps). Raw tokens are never stored, logged or returned by the API.
- Requesting a new link invalidates every earlier outstanding link for that account.
- Resetting a password increments the account's `token_version`, which signs out every existing session.
- New passwords must be at least 12 characters and at most 72 UTF-8 bytes, matching the existing policy.
- Google-only accounts keep using Google sign-in. They receive the same generic response and no reset email or token is created for them.
- The reset page is `noindex,nofollow`, reads the token from the URL fragment (never sent in a Referer header), removes it from the address bar after reading, and keeps it only in memory for the single POST. It is never written to `localStorage` or analytics.
- Requests are rate-limited per IP and per normalized email. If email is not configured, both endpoints and the page fail with a clear setup message rather than pretending a message was sent.

### Set up reset email with Resend

1. Create a free account at [resend.com](https://resend.com) and add **popuploom.com** as a sending domain.
2. Open the domain's **Records** tab in Resend and add the exact values it shows. For `popuploom.com` these are normally an **MX** and **TXT SPF** record on the `send` subdomain (for example `v=spf1 include:amazonses.com ~all`), a **DKIM TXT** record at `resend._domainkey`, and a **DMARC TXT** record at `_dmarc` (for example `v=DMARC1; p=none; rua=mailto:…`). Newer Resend domains may use CNAME records for SPF instead of TXT/MX; copy exactly what the dashboard generates. Wait for Resend to report the domain as **Verified** before sending.
3. Create an API key and configure it:
   ```bash
   # Express (.env)
   RESEND_API_KEY=re_…
   RESET_EMAIL_FROM="PopupLoom <reset@popuploom.com>"
   PUBLIC_ORIGIN=https://popuploom.com

   # Cloudflare Worker (encrypted secret)
   wrangler secret put RESEND_API_KEY
   ```
4. Restart the server. If `RESEND_API_KEY` is missing or the sender is empty, `/api/auth/forgot-password` answers `503` with `RESET_EMAIL_NOT_CONFIGURED` and the setup message.

Resend's free plan allows **3,000 emails per month and 100 per day**. A reset request sends at most one email and is rate-limited, but a burst of real users can still hit the daily cap; the API logs provider failures without the token or recipient and keeps the generic response. Verify SPF/DKIM for `popuploom.com` so mail is not rejected or filed as spam. The project never emails a password and never logs a reset token.

Countdown presets now choose a fixed deadline; unrelated edits and saves preserve it. Expiry stops the displayed clock but does not enforce checkout discounts or automatically hide the popup. Template forms collect responses and use truthful default confirmation text. Sending emails, PDFs or calendar invitations needs the website owner's integration. The optional client-side webhook remains best effort, with explicit limitations in the editor; it is not a reliable delivery queue. `/privacy.html` describes actual storage and external requests without claiming legal certification.
