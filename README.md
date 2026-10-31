# PopForge

A fresh, self-serve popup tool for your own site visitors to create, save, and reuse. Built from scratch. Vanilla frontend (no build step) plus a small Node backend (Express + SQLite) for accounts, cloud saves, and lead/view tallies.

> Design note: PopForge is conceptually inspired by existing popup platforms but is an original product. Its own identity, dark-studio UI, template designs, copy, naming, and an improved behavior model. Nothing is copied.

---

## Files

| File | What it is |
|---|---|
| `index.html` | Landing page + template gallery (45 live mini-previews, category filters) + My popups shelf/dashboard |
| `studio.html` + `studio.js` | The editor ("studio"): Content / Design / Behavior / Publish tabs with live preview |
| `popforge.js` | The runtime. The drop-in embed engine your visitors paste onto their sites |
| `app.js` | Shared code: API-aware storage, auth, the template catalog (original designs), helpers |
| `assets/` | Original template imagery (twelve generated in-house product shots across discount, email, gamified and seasonal templates) |
| `ui.css` | Studio/landing theme |
| `demo.html` | Fake storefront with five popups armed (age gate, spin wheel, flash deal, social proof, video), for end-to-end testing |
| `server/` | Express API: auth (JWT + bcrypt + Google ID-token verification), widget CRUD, live public config, view tallies, lead submissions; SQLite via `node:sqlite` |
| `package.json` | Backend deps + start scripts (`bcryptjs`, `cors`, `express`, `jsonwebtoken`, `google-auth-library`) |
| `.env.example` | Template for `PORT`, `JWT_SECRET`, `GOOGLE_CLIENT_ID` |

## Run it

```bash
cd popforge
npm install
npm start
# → http://localhost:3000   (API: /api, DB: popforge.db)
```

Requires Node 22.13+ (built and tested on Node 24) — the server uses `node:sqlite`, `process.loadEnvFile`, and `fetch`. The database file is created automatically on first boot. Copy `.env.example` to `.env` first if you want Google sign-in or a production secret.

| Env var | Default | Purpose |
|---|---|---|
| `PORT` | `3000` | HTTP port |
| `DB_PATH` | `<project>/popforge.db` | SQLite file location |
| `JWT_SECRET` | random per-process development secret | Required in production; use a unique random secret of at least 32 characters. Signs 30-day login tokens |
| `GOOGLE_CLIENT_ID` | empty | Enables Sign in with Google. Empty = the Google button is hidden and `/api/auth/google` answers 503 |

Example production start:

```bash
JWT_SECRET="$(openssl rand -hex 32)" PORT=8080 npm start
```

## Accounts, installation and Google sign-in

Installation is account-gated. Anyone can open the studio, design a popup, and preview it, but the install code is issued only for a popup saved to a real account. Guest drafts live in `localStorage` and are moved into the account automatically on first sign-in.

Every saved widget gets its own id (`wan_…`) and its own install code:

```html
<!-- PopForge: paste once, before </body> -->
<div data-popforge="wan_your_widget_id"></div>
<script src="https://your-popforge-host/popforge.js"></script>
```

The snippet carries only the id. `popforge.js` fetches the live config from `GET /api/widgets/:id/config` when the page loads, so saving in the studio updates every installed copy without re-pasting. Old inline base64 snippets still work.

### Set up Google sign-in (one-time, ~5 minutes)

Google Identity Services needs a client id. No client secret is used: the server verifies the signed ID token against the client id.

1. Open [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials) and create (or pick) a project.
2. Configure the **OAuth consent screen** (External): app name `PopForge`, your support email, and the `openid`, `email`, `profile` scopes. While the app is in **Testing**, add your own Google address under **Test users**.
3. **Create credentials → OAuth client ID → Web application.**
4. Under **Authorized JavaScript origins** add:
   - `http://localhost:3000` for local development
   - `https://your-production-domain.com` when you deploy
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

The embed runtime finds the API in this order: `data-api` attribute on the widget div, then `window.POPFORGE_API`, then the origin `popforge.js` was loaded from. CORS is open for these public reporting endpoints, so widgets on other domains report correctly.

## The saved-widget lifecycle

1. Visitor opens the gallery on `index.html`, picks a build, lands in the studio
2. Guests can design and preview; drafts stay in `localStorage` and no install code is issued
3. To install, they create an account (email/password or Google). Guest drafts migrate into the account automatically
4. Save widget stores it in SQLite under their account (My popups, cloud pill)
5. Publish tab issues that widget's own install code (`<div data-popforge="wan_…">` + `popforge.js`), tied to the account that saved it
6. Any of their popups can be re-opened, edited, duplicated, or deleted from My popups anytime; edits sync to installed copies
7. Export all (.json) backs the shelf up; Import file restores on another machine
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
| Analytics | `popforge:view / open / close / submit` window events + `dataLayer` pushes when GTM exists |
| Safety | URL/image inputs sanitized (HTML-escaped), CSS-selector errors caught, lazy render (nothing loads until summoned) |
| Animations | pop (spring) · fade · slideUp · slideDown; all opt-in |

## Embedding on a site (what end users copy)

```html
<!-- PopForge install. Paste once, before </body> -->
<div data-popforge="wan_your_widget_id"></div>
<script src="https://your-popforge-host/popforge.js"></script>
```

Each account-owned widget has its own id in that `data-popforge` attribute. The runtime resolves it against `GET /api/widgets/:id/config`, so the site never needs re-editing after a design change. The studio fills in the absolute script URL for you.

Power users can still hand-write an inline base64 config (the older format) or call `PopForge.show(cfg)` directly. Inline configs always start with `eyJ` and skip the network fetch; hosted ids match `/^[A-Za-z0-9_-]{3,64}$/`.

Platform notes (learned from researching competitors so you don't repeat their gaps):

- Works wherever raw HTML runs: WordPress (Custom HTML), Shopify (liquid/sections), Webflow embeds, Ghost, GitHub Pages, static sites.
- On builders that trap third-party widgets in iframes (some Wix/GoDaddy/Hostinger embeds, Google Sites, Canva), a fixed popup can't escape the frame. Install at body level where the platform allows code, or prefer the strip placements.

See [SECURITY.md](SECURITY.md) for the security review, deployment settings and public-config trust boundaries. New passwords require at least 12 characters. Set APP_ORIGINS for additional trusted frontend origins; private APIs otherwise accept only the app origin.

Run `npm test` for isolated API, auth and browser regression checks. Browser checks use Chrome/Edge when available; set `POPFORGE_BROWSER` to an executable path to override. Existing project data is never used by the tests.

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

## Differences from the platforms we studied (intentional)

- Fresh dark-studio editor UI; original template set, names, copy, and generated imagery throughout
- Spin-to-win as a first-class block. Elfsight's gallery has no wheel (an open community request); Wisepops/OptinMonster gate theirs behind email-first flows. Ours is config-driven, one tap
- 18+ age gate as a native template + block, not a DIY rebuild from a generic lightbox
- CSS selectors instead of element IDs for click / scroll-past triggers (more flexible)
- A 5th frequency rule: "until closed, then rest 24h". Better post-conversion etiquette
- Counts views and leads for the user's popups without a view-count paywall
- The countdown is a real live block, auto-armed from a date picker in the editor
- iframe/escape-hatch guidance ships in-product instead of a footgun

## Roadmap ideas

- A/B rule pairs on one widget · audience rule (new vs returning) · per-country shows
- Email-provider connectors (ConvertKit/Mailchimp) on top of the existing DB + webhook capture
- Template import from JSON in the studio
- Per-widget public share links (view-only preview)
