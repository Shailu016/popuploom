# Implicit state machines in PopupLoom

**Status:** inventory completed 2026-11-12. P1/P2 defects and low-risk P3s were
fixed on 2026-11-14; the sections below note where implemented behaviour now
differs from the original reading. Ad eligibility, CSP and injection behaviour were
not changed.
**Method:** static reading of the client runtime, studio, account pages, Worker and
Express mirrors, shared modules and D1 schema. No runtime instrumentation and no
traffic replay, so "failure mode" entries are reasoned from the code rather than
observed in production.
**Scope:** every place where behaviour depends on remembered state that is not
modelled in one obvious place: module variables, flags, timestamps, localStorage
keys, database columns, env vars and row-presence.

An **implicit** state machine here means: the states exist and the transitions are
real, but no single module declares the transition table. The rules are spread
across a guard here, a timestamp there and a column default somewhere else. That
is why several of the findings below are "two runtimes disagree" rather than
"the code is wrong in one place".

Legend: **P1** = user-visible or security-relevant divergence; **P2** = silent
degradation or operational blind spot; **P3** = cosmetic/robustness.

---

## 1. Master index

| ID | Machine | State lives in | Primary code |
|----|---------|----------------|--------------|
| SM-01 | Session / bearer token | `localStorage["pf.token"]`, JWT claims, `users.token_version`, `revoked_tokens` | `app.js`, `worker/auth.js`, `server/auth.js` |
| SM-02 | Signup → email verification | `users.email_verified`, `email_verification_tokens` | `worker/auth.js`, `shared/email-verification.js` |
| SM-03 | Password reset | `password_reset_tokens.used_at/expires_at`, `users.token_version` | `worker/password-reset.js`, `reset-password.js` |
| SM-04 | Google identity linking | `users.google_id`, `token_version` | `worker/auth.js`, `server/auth.js` |
| SM-05 | Account mutation / re-auth | request body `credential`, 5-minute window | `account.js`, `worker/auth.js` |
| SM-06 | Widget record lifecycle | `widgets` rows, `pf.widgets` | `app.js`, `worker/widgets.js`, `studio.js` |
| SM-07 | Guest → account draft migration | `pf.widgets`, API create | `app.js` (`migrateGuestDrafts`) |
| SM-08 | Studio editor state | `saving`, `widgetId`, 120 ms preview debounce, DOM values | `studio.js` |
| SM-09 | Publish/install readiness | `PF.auth.isAuthed()`, `widgetId`, DOM panels | `studio.js` (`renderPublish`) |
| SM-10 | Runtime instance lifecycle | `visible`, `holderEl`, `Runtime._inst`, `data-*-ready` | `popuploom.js` |
| SM-11 | Trigger arming | `timer`, `scrollHandler`, `io`, `clickHandler`, `exitHandler` | `popuploom.js` (`arm`/`unbind`) |
| SM-12 | Frequency capping | `pf.<id>.shown`, `pf.<id>.closed` | `popuploom.js` (`freqOk`) |
| SM-13 | View telemetry + dedupe | `widgets.view_count`, `rate_limits` keys, `pfview.<id>` | `worker/http.js`, `worker/widgets.js`, `server/routes/widgets.js` |
| SM-14 | Lead submission + idempotency | `submissions.request_id`, `_pendingLead`, `_submitting` | `popuploom.js`, `worker/widgets.js` |
| SM-15 | Interactive sub-states (age gate, spin, choices) | DOM only, plus `_pendingLead` | `popuploom.js` |
| SM-16 | Webhook endpoint config | `webhook_endpoints` row (`enabled`, `secret`) | `worker/widgets.js`, `leads.js` |
| SM-17 | Webhook delivery attempts | `webhook_deliveries.status/attempts/completed_at` | `shared/webhook.js`, `worker/widgets.js` |
| SM-18 | Ad eligibility / consent gate | env flags, `ADSENSE_SLOTS`, nonce per response | `shared/ads.js`, `shared/ad-pages.js` |
| SM-19 | Rate-limit windows | `rate_limits` (D1) or in-memory `Map` (Express) | `worker/http.js`, `server/limits.js` |
| SM-20 | Host / cutover redirects | `DOMAIN_CUTOVER_ENABLED`, host sets | `shared/host-policy.js` |
| SM-21 | Leads inbox paging / export | `rows`, `cursor`, `busy`, `exporting`, `controller` | `leads.js`, `app.js` (`Leads.all`) |
| SM-22 | Manual legacy recovery page | `pf.widgets` read once | `migration.html` |

---

## 2. Identity and access

### SM-01 — Session / bearer token

**States:** `anonymous` → `authenticated` → `revoked | expired`.

**Transitions**
- `anonymous → authenticated`: login, register (only when verification is off),
  Google exchange, or email verification (which signs the user in).
- `authenticated → anonymous`: logout (server inserts into `revoked_tokens` and the
  browser clears `pf.token`), any `401` from `/api/auth/me` (client clears the
  token), password reset (`token_version + 1`), password change (`token_version + 1`).
- Implicit expiry: JWT `30d`; `authMiddleware` compares the token's `tokenVersion`
  claim with the live `users.token_version` (`worker/auth.js:331-332`).

**Persisted in:** browser `localStorage["pf.token"]`; server JWT + `users.token_version`
+ `revoked_tokens(token_hash, expires_at)`.

**Invariants**
- A token is valid only while its `tokenVersion` equals the database value.
- Logout must not fail closed: a `401` from logout still clears local state.
- Account deletion invalidates by row removal, not by a token flag.

**Failure modes**
- `localStorage` is shared by every script on the origin; the 30-day bearer token
  is readable by any XSS (known open finding **F-01**).
- The client treats token presence as "authenticated" (`isAuthed`) before any
  server check, so the UI can briefly render signed-in state for a dead token.
- Two tabs: logout in one tab does not notify the other except in `leads.js`, which
  listens to `storage` events. The studio and dashboard do not.

**Formalisation value:** high. One `session` object with `unknown | valid | expired`
would remove the "presence means valid" assumption and give every page one 401 path.

---

### SM-02 — Signup → email verification

**States:** `absent` → `unverified` → `verified`, plus `verification_token:
issued | consumed | expired | superseded`.

**Transitions**
- Register with a free address: insert user with `email_verified = 0`, invalidate
  older unused tokens, insert a new token (`worker/auth.js:112-143`).
- Register with an existing address: generic `201`, no user created; the route sends
  the "you already have an account" email instead of a verification link
  (`worker/index.js:137-148`, `shared/email.js:143-173`).
- Verify: `used_at IS NULL AND expires_at > now`, then a conditional `UPDATE ... used_at`
  so two concurrent clicks cannot both consume it (`worker/auth.js:186-196`).
- Login while unverified: `401` with the same wording as a wrong password, plus
  `code: "EMAIL_NOT_VERIFIED"` so the client can offer a resend
  (`worker/auth.js`, `server/auth.js`).

**Resend transition (added 2026-11-14):** `POST /api/auth/resend-verification`
always returns the same body. Only a registered, still-unverified address receives
a new token and mail; unknown and already-verified addresses are silent. The route
is IP- and normalized-email-limited and supersedes the previous unused token.
- Reset password: sets `email_verified = 1` and bumps `token_version`
  (`worker/password-reset.js:67`), because receiving the reset mail proves inbox control.

**Persisted in:** `users.email_verified`, `email_verification_tokens`
(24 h TTL, SHA-256 of the token only).

**Invariants**
- Registration response is identical for new and existing addresses (F-15).
- Only one live token per user; issuing a new one marks the old `used_at`.
- A verified user is never returned to `unverified`.

**Failure modes**
- **Resolved 2026-11-14.** The expired-link dead end now has a forward transition:
  sign-in returns `code: "EMAIL_NOT_VERIFIED"` and the auth modal offers
  "Email me a new verification link". The endpoint is enumeration-safe: identical
  response for unknown, verified and unverified addresses.
- If `REQUIRE_EMAIL_VERIFICATION` is flipped off, `verificationRequired` is false and
  new rows are created verified; existing unverified rows still cannot sign in
  (the check is also gated by the flag, so they actually can). The mode flip is a
  deployment-level transition with no migration or audit trail.
- `ensureVerificationSchema` self-heals D1 at request time; if it fails for a
  transient reason the isolate keeps `verificationSchemaReady = false` and retries,
  which is correct but silent.

**Formalisation value:** high, mostly to add `resend` as a legal transition without
reopening enumeration.

---

### SM-03 — Password reset

**States:** `idle` → `requested` → `opened` → `consumed | expired | invalidated`.
UI panels: `request | reset | done | error`.

**Transitions**
- Request always answers generically; unknown and Google-only accounts produce no
  mail (`shared/password-reset.js:13`).
- Token: 32 random bytes, base64url, 30-minute TTL, only the SHA-256 stored
  (`worker/password-reset.js`).
- Consume: conditional update on `used_at IS NULL AND expires_at > now`; on success
  the password hash is replaced, `token_version + 1`, and **all** other unused reset
  tokens for that user are burnt (`worker/password-reset.js:62-69`).
- Client: token is read from the fragment, the fragment is stripped with
  `history.replaceState`, and the token lives only in a closure (`reset-password.js:40-46`).

**Persisted in:** `password_reset_tokens`, `users`.

**Invariants**
- A token is single-use and expires in 30 minutes.
- Consumption revokes every existing session.
- The token never appears in a URL that reaches a server log or `Referer`.

**Failure modes**
- If email is not configured the endpoint returns `503 RESET_EMAIL_NOT_CONFIGURED`;
  the UI shows it as a generic failure, which is correct but gives no operator signal
  beyond the response code.
- The page does not distinguish "expired" from "already used"; both say invalid.
  That is good for security and mildly confusing for a user who clicked twice.

**Formalisation value:** medium. The server is already a clean two-phase machine;
the value is naming it so the UI copy can be derived from the state.

---

### SM-04 — Google identity linking

**States per user:** `password-only` → `linked` (and, in practice, `google-only`
accounts created by `findOrCreateGoogleUser`).

**Transitions**
- Google credential verified against Google JWKS; if the email matches an existing
  password account, the account is linked, `token_version + 1` revokes existing
  sessions. **A verified account keeps its password; an unverified account has
  `password_hash` overwritten with a random unusable hash** (`worker/auth.js`,
  `server/auth.js`). The unverified case prevents a stranger who pre-registered the
  address from retaining access after the real owner arrives via Google.
- New Google user: created with the same unusable random hash (`worker/auth.js:276-280`).
- Email-domain gate: linking by email is allowed only for `@gmail.com` or a verified
  Google Workspace hosted domain; other addresses must sign in with their password
  (`worker/auth.js:267-270`).

**Invariants**
- Verified Google email is authoritative; linking requires that verification.
- One `google_id` may map to only one user (`idx_users_google` unique partial index).

**Failure modes**
- **Linking is one-way in the UI.** There is no "unlink Google" transition. A linked
  user whose Google account is later lost must use password reset to get back in
  (verified accounts keep their password, so they can also sign in with it).
- Linking revokes sessions without telling the user why they were signed out.
- **Resolved 2026-11-14:** linking no longer destroys the credential of an already
  verified password account; only unverified (pre-registration) credentials are
  replaced.

**Formalisation value:** low today, because the surface is small.

---

### SM-05 — Account mutation / re-authentication

**States:** `idle` → `credential-fresh (≤5 min)` → `action-submitted` →
`done | error`.

**Transitions**
- `account.js` caches a Google credential with `verifiedAt`; it is sent only while
  `Date.now() - verifiedAt < 300000`.
- Password change bumps `token_version`; account deletion removes the user row, so
  every later token lookup fails. The client clears the token and redirects to
  `/#dash` in both cases.
- Delete requires a native `confirm()` plus typing the account email, which the server
  re-checks (`worker/auth.js:376-388`).

**Persisted in:** module variables only (`credential`, `verifiedAt`).

**Invariants**
- A stale Google credential is never sent.
- Any successful mutation invalidates the current session.

**Failure modes**
- The 5-minute freshness is enforced only client-side; the server must also check
  the credential's `iat`. Worth confirming in the Worker handler.
- Buttons are disabled during the request but there is no in-flight state on the
  identifier; a slow network looks like a dead button.

**Formalisation value:** medium if account deletion grows; low while it stays two
actions.

---

## 3. Widget and studio lifecycle

### SM-06 — Widget record lifecycle

**States:** `absent` → `guest-draft` → `cloud-draft` → `cloud-saved` → `deleted`.
Note there is no separate `published` state. Saving a cloud widget *is* publishing:
the public `/config` endpoint serves the latest row.

**Transitions**
- Create in studio as guest: row appended to `localStorage["pf.widgets"]` with a
  client-generated `wan_…` id (`app.js:134-162`).
- Sign in: subsequent saves go to the API; the server generates the id and the
  client rewrites `w.cfg.id` to match (`app.js:147-154`).
- Delete: server deletes the row even if foreign keys are off, plus submissions and
  webhook rows (`worker/widgets.js:140-149`).
- A deleted id is never reissued, because ids are server-generated and never accepted
  from the client (`worker/widgets.js:107-111`).

**Persisted in:** `widgets` row / `pf.widgets` array.

**Invariants**
- A widget id in the wild always refers to the same owner's popup, or to nothing.
- Deleting an account cascades to widgets, submissions and webhook rows.

**Failure modes**
- Deletion is terminal but embeds have no terminal UI: the runtime logs "no published
  config" and renders nothing. Visitors see nothing rather than a tombstone.
- Guest and cloud use different id sources, so the same logical draft can exist twice
  if migration partially fails (see SM-07).
- `getWidgetConfig` says "cached for 30s" in its comment but sends
  `Cache-Control: no-store` (`worker/widgets.js:75-87`). The comment describes an
  older design; the code is the safer of the two.

**Formalisation value:** high. `draft | saved | deleted` is already the real model,
and naming it would make the studio, embed and API agree on what "published" means.

---

### SM-07 — Guest → account draft migration

**States:** `guest-only` → `migrating` → `migrated | partially-migrated`.

**Transitions**
- After authentication, `migrateGuestDrafts` iterates the guest array, calls
  `save` for each valid config, counts successes, and rewrites the remainder
  (`app.js:220-242`).
- Success removes `pf.widgets` entirely; partial success keeps only failures.

**Invariants**
- A failed draft is never silently discarded.
- Migration is idempotent in effect: once a draft is saved to the cloud it leaves
  the local list.

**Failure modes**
- **Resolved 2026-11-14.** Migration is single-flight in a tab (`migrationRun`) and
  guarded by a cross-tab `pf.migrating` lock with a 60 s lease. Two tabs that sign
  in together no longer replay the same drafts.
- There is no user-visible "N drafts moved" confirmation on the dashboard from this
  path (the function returns a count, but callers may ignore it).
- A draft that is invalid (`!w.cfg`) is kept forever and re-tried on every sign-in.

**Formalisation value:** medium-high; a single `migration` record with a run id
would make duplicates impossible to create silently.

---

### SM-08 — Studio editor state

**States:** `clean` → `dirty` → `previewing (120 ms debounce)` → `saving` →
`saved | save-failed`.

**Transitions**
- Any input in `#panel-rail` calls `refresh()`: gather DOM → debounce 120 ms →
  destroy and rebuild the preview (`studio.js:464-482`).
- Save sets `saving = true`, gathers, assigns `state.id = widgetId || PF.uid()`,
  calls `PF.store.save`, adopts the server id, re-renders publish (`studio.js:593-615`).
- Delete clears `widgetId` and assigns a fresh local id (`studio.js:625-635`).

**Persisted in:** `widgetId`, `saving`, `previewInst`, DOM values, and the saved row.

**Invariants**
- A second save cannot start while one is in flight.
- The preview never writes storage or telemetry (`preview` flag short-circuits
  `freqOk`, storage writes and `notify`).

**Failure modes**
- **Resolved 2026-11-14.** Studio now tracks `dirty`, bumps `editVersion` on every
  user edit, and registers a `beforeunload` guard. Save captures the version and
  only clears `dirty` when the snapshot it sent is still current, so rapid edits
  during an in-flight save are reported as unsaved instead of "Saved".
- `state.id` is still mutated before the save result; on failure the unsaved draft
  carries an id that does not exist server-side. A later save self-heals because
  creation mints a new id, but the intermediate state remains misleading.

**Formalisation value:** high. `clean | dirty | saving | error` is exactly what the
UI needs, and it would give autosave or an unload guard a natural home.

---

### SM-09 — Publish / install readiness

**States:** `signed-out` → `signed-in-unsaved` → `ready`.

**Transitions** (`studio.js:501-520`)
- `gate` visible when signed out.
- `unsaved` visible when signed in but `widgetId` is null.
- `ready` + snippet when both are true.

**Invariants**
- Install code exists only for an account-owned, saved widget.
- Copying the snippet while not ready opens the auth modal instead of copying.

**Failure modes**
- The snippet is generated from `widgetId`, which is only set after a successful
  save. A save that succeeds server-side but fails to return an id would leave the
  UI permanently "unsaved" while a row exists.
- There is no "config changed since embed" signal; the embed always fetches live, so
  there is nothing to signal. That is a deliberate simplification worth documenting.

**Formalisation value:** medium; it is a derived view of SM-06/SM-08.

---

## 4. Runtime (customer sites)

### SM-10 — Runtime instance lifecycle

**States:** `unmounted` → `loading` → `armed` → `visible` → `closing` → `closed` →
`destroyed`.

**Transitions**
- `boot()` scans `[data-popuploom], [data-popforge]`, skips nodes already marked
  ready, sets `loading`, then either mounts inline config or fetches `/config`
  (`popuploom.js:1050-1068`).
- `mountCfg` constructs one `PopupInstance`, pushes it into `Runtime._inst`, calls
  `arm()`, and marks the node `ready=1` (`popuploom.js:1002-1010`).
- `show()` guards on `visible`, renders, mounts, and only then reports the view
  (`popuploom.js:475-590`).
- `close()` removes the node after 170 ms, clears intervals, sets `visible=false`
  (`popuploom.js:591-607`).
- `destroy()` unbinds, removes the sticky button, and calls `close()`.

**Persisted in:** instance fields plus `data-popuploom-ready` / `data-popforge-ready`.

**Invariants**
- One node mounts at most one instance, even if both attribute names are present.
- A second copy of the runtime reuses the first (`window.PopupLoom` / `PopForge`).
- Preview and test instances never write storage or send telemetry.

**Failure modes**
- A config fetch failure clears the ready marker and only `console.warn`s. A slow
  or blocked API leaves the popup silently absent; there is no retry or fallback.
- `destroy()` writes the `closed` timestamp (through `close()`), so a programmatic
  teardown counts as a user close for `close24h`. That may suppress the next
  legitimate show.
- If `cardHTML` throws after `visible = true`, the instance is stuck visible with no
  holder; subsequent `show()` calls return early.

**Formalisation value:** high; this is the core state machine of the product.

---

### SM-11 — Trigger arming

**States per trigger:** `unarmed` → `armed` → `fired` → `unbound`.
Trigger types: `load`, `delay`, `scrollPct`, `scrollTo`, `click`, `exitIntent`.

**Transitions**
- `arm()` returns immediately if device/page/frequency gates fail
  (`popuploom.js:407-412`), otherwise installs exactly one listener/timer.
- `fire()` calls `unbind()` first, so a trigger can fire once
  (`popuploom.js:459-466`).
- `click` validates the selector once with `querySelector`, then guards the handler
  with `closest`.
- `scrollTo` uses `IntersectionObserver` at 0.15 threshold and disconnects on entry.
- `exitIntent` is skipped on touch devices by design.

**Invariants**
- At most one active trigger per instance.
- Invalid selectors fail loudly in the console and do not leave a listener behind.

**Failure modes**
- `arm()` silently disables the popup when gates fail; there is no debug surface
  explaining which gate failed (`freqOk` vs `pageOk` vs `deviceOk`).
- A `click` trigger on an element added later never fires, because the selector is
  validated once at arm time.
- `scrollPct` computes percentage against `scrollHeight - innerHeight`; on short
  pages it fires immediately (max = 0 → 100%). That is arguably correct but
  surprising for "scroll 50%".

**Formalisation value:** medium; mostly for diagnostics.

---

### SM-12 — Frequency capping

**States:** `eligible` ↔ `suppressed`, driven by two timestamps.

**Transitions** (`popuploom.js:384-405`)
- `always`: no state.
- `close24h`: eligible when `!closedAt` or `now ≥ closedAt + 24 h`.
- `once:ever`: eligible only when `shown` is absent.
- `once:day`: eligible when never shown or on a different local calendar day.
- `once:week`: eligible when never shown or ≥ 7 days since `shown`.

Writes: `shown` on `fire()` (`popuploom.js:463-464`), `closed` on `close()`
(`popuploom.js:602`).

**Persisted in:** `localStorage["pf.<id>.shown"]`, `["pf.<id>.closed"]`.

**Invariants**
- Preview/test instances never read or write these keys.
- Storage failures are swallowed; the popup still works.

**Failure modes**
- **Fails open on blocked storage.** In Safari private mode or with storage denied,
  every pageview is eligible. That is the right availability trade-off but should be
  a documented product decision.
- Keys are per widget id. A deleted and recreated widget (new id) resets all caps;
  a re-used inline name hash also resets them.
- `close24h` treats a programmatic destroy as a close (see SM-10).
- `once:day` uses the visitor's local timezone, so "day" differs per visitor.

**Formalisation value:** medium; the rules are already a clean table, they are just
not named.

---

### SM-13 — View telemetry and dedupe

**States:** `unreported` → `reported (first in window)` → `deduplicated`.

**Transitions**
- Runtime increments `pfview.<id>` locally and POSTs `/view` fire-and-forget
  (`popuploom.js:580-588`).
- Worker: rate-limit the IP, drop unknown ids with `204`, then `dedupeView`
  keyed by `sha256("dedupe:view:" + widgetId + ":" + CF-Connecting-IP)` for 1 h
  (`worker/http.js:51-71`). Only the first increments `view_count`.
- Express: same shape, but now also keyed by `req.ip` and deliberately ignores
  `x-visitor-id` (`server/routes/widgets.js`).
- Guest dashboard reads `pfview.<id>` back through `Store.views`, so the local
  counter is no longer write-only (`app.js`).

**Persisted in:** `widgets.view_count`, `rate_limits` (both runtimes).

**Invariants**
- A page refresh inside the window does not inflate the counter.
- Unknown widget ids are silent and do not create rows.

**Failure modes**
- **Resolved 2026-11-14.** Both runtimes now ignore the client-controlled
  `x-visitor-id`; the Express mirror uses `req.ip` under the configured proxy
  policy, matching the Worker's `CF-Connecting-IP` rule.

**Formalisation value:** medium; the dedupe key is the whole machine.

---

### SM-14 — Lead submission and idempotency

**States:** `idle` → `submitting` → `stored | failed`, with a retained
`requestId` for retry.

**Transitions**
- `recordSubmission` builds a fingerprint of the payload; if it differs from the
  retained one, it mints a new `requestId` (`popuploom.js:842-857`).
- `submitLike` guards with `_submitting`, disables every control, restores prior
  disabled states in `finally` (`popuploom.js:870-901`).
- Server inserts with `ON CONFLICT(widget_id, request_id) WHERE request_id IS NOT NULL
  DO NOTHING`; only a real insert triggers the webhook (`worker/widgets.js:259-267`).
- Unknown widget → `202 { ok:false, stored:false }`; the client treats that as
  failure (`worker/widgets.js:247-254`, `popuploom.js:853-855`).

**Persisted in:** `submissions.request_id`, in-memory `_pendingLead`.

**Invariants**
- A retry of the same payload cannot create a second lead.
- Lead PII is never persisted on the customer's origin.
- A submission is only confirmed when the server says it was stored.

**Failure modes**
- **Resolved 2026-11-14.** A `202 stored:false / unknown_widget` response now marks
  the runtime `_unavailable` and renders a terminal "This popup is no longer
  available" error. Controls stay disabled; the close button stays usable.
- `requestId` lives only in memory. A page reload after a lost response mints a new
  id, so a retry after reload can duplicate a lead. The window is small but real.
- `_pendingLead` is cleared only on success; if the user edits the payload after a
  failure, the id changes by design, which is correct for a genuinely different lead
  and wrong for a corrected typo in the same lead.
- **Resolved 2026-11-14.** Guest `putSubmission` no longer writes
  `pfsubs.<id>`; it reports `false` instead. The runtime remains the only submit
  path and still never persists lead payloads on the customer's origin.

**Formalisation value:** very high. This is the money path.

---

### SM-15 — Interactive sub-states (age gate, spin, choices)

**States**
- Age gate: `unanswered` → `allowed` (submitted `{ageVerified:true}`, closes after
  1.1 s) or `denied` (optional redirect, otherwise message and close).
- Spin: `ready` → `spinning` (4.35 s animation) → `prize-pending` → `saving` →
  `won` or `retry`.
- Choices: `unanswered` → `submitted` via `submitLike`.

**Persisted in:** DOM only; `spin` retains `pendingPrize` and `wheel._rot`.

**Invariants**
- Denial/allowance is recorded as a lead when possible, but the gate itself has no
  memory: refreshing the page asks again.
- Spin cannot double-submit while `_spinning`; the hub is disabled during save and
  becomes a retry button on failure.

**Failure modes**
- Age state is not persisted, so a denied visitor can reload and retry. This matches
  an "age declaration" model, not a legal age gate; the copy now reflects that.
- Studio still stores `ageGate.minAge = 18` and default labels mentioning 18
  (`studio.js:381-389`), which sits awkwardly next to the de-emphasised site copy.
  Decide whether `minAge` is a real constraint or dead config.
- Spin uses `Math.random()` (fine for a prize display, not for anything of value).

**Formalisation value:** low-medium; these are small leaf machines.

---

### SM-16 — Webhook endpoint configuration

**States:** `none` → `configured-enabled` ↔ `configured-disabled` → `deleted`,
plus `secret: initial | rotated`.

**Transitions**
- Save: validate URL (HTTPS, public address, DNS-resolved), insert or update,
  keep the existing secret unless `rotateSecret` is true (`worker/widgets.js:160-181`).
- Delete: removes the endpoint and its delivery log (`worker/widgets.js:183-189`).
- Test: requires an endpoint; sends a synthetic `lead.created` event with `test: true`.

**Persisted in:** `webhook_endpoints`.

**Invariants**
- The secret is only returned to the authenticated owner.
- `enabled` is a hard gate at delivery time (`AND enabled = 1`).

**Failure modes**
- Rotating the secret invalidates the receiver immediately; there is no dual-secret
  grace window. The UI does warn, but a missed update silently fails all deliveries.
- The URL is re-validated on every delivery attempt, so a DNS change to a private
  address silently stops delivery with `status: failed` and no distinct reason code
  visible to the user beyond the error text.

**Formalisation value:** medium.

---

### SM-17 — Webhook delivery attempts

**States:** `attempt 1` → `attempt 2` → `attempt 3` → `success | failed`.
A `pending` row is written before the first attempt (2026-11-14).

**Transitions** (`shared/webhook.js:195-241`)
- Up to 3 attempts with delays `[0, 500, 1500]`, 6 s timeout each.
- Retries only on network error, timeout, `408`, `429`, `5xx`.
- Redirects are not followed; the URL is re-validated before every attempt.
- Result is written after the loop finishes, with `completed_at` set
  (`worker/widgets.js`, `server/routes/widgets.js`). The initial row is inserted
  with `status: "pending"` before the first attempt and updated in place, so a
  killed attempt leaves visible evidence. Pending rows older than one day are swept
  on the next delivery for the same widget. History is capped at 100 rows per widget.

**Persisted in:** `webhook_deliveries`.

**Invariants**
- A 2xx is the only success.
- A non-retryable 4xx stops immediately.
- At most 100 delivery rows per widget.

**Failure modes**
- **In-flight visibility improved 2026-11-14.** A `pending` row now exists before the
  first attempt and is updated on completion; stale pending rows are swept after one
  day. This is visibility, not durability: `waitUntil` still gives no completion
  guarantee, there is no queue, lease or retry sweep, and a crash between lead insert
  and delivery still means the webhook is never sent (**F-08**).
- `status` is now `pending | success | failed`, so "never completed" is at least
  visible to the owner.
- Delivery is skipped entirely for duplicate submissions, which is correct.

**Formalisation value:** high if webhooks are sold as reliable; otherwise document
the at-most-once-ish semantics explicitly.

---

## 5. Platform and operations

### SM-18 — Ad eligibility / consent gate

**States:** `disabled` | `approval-not-confirmed` | `invalid-publisher` |
`invalid-client` | `cmp-not-google` | `no-valid-slot` | `enabled`.

**Transitions** (`shared/ads.js:71-98`)
- Evaluated per request from env; any failed gate returns the original HTML unchanged.
- Per-page eligibility is a separate allowlist (`shared/ad-pages.js`, 20 pages).
- Injection is idempotent: skips if `data-pl-ad=` or `adsbygoogle.js` is already present.
- A nonce is minted per response; the loader goes in `<head>`, the unit before
  `</article>` / `</main>` / `<footer>` / `</body>` in that order.

**Persisted in:** deployment env + page allowlist.

**Invariants**
- Ads never appear on a page outside the allowlist, even if a slot is configured.
- A missing nonce disables injection rather than emitting an inline script.
- Never more than one unit per page.

**Failure modes**
- **Silent fail-closed improved 2026-11-14.** `ads.warnIfDisabled` logs one warning
  per distinct reason per process/isolate. Injection, eligibility, allowlist and CSP
  behaviour are unchanged.
- Consent state is entirely delegated to Google's CMP. The origin cannot tell
  consented from unconsented; it relies on Google not filling. That is the correct
  design for TCF, but it means "ads are live" and "ads are filling" are different
  states and only the second is observable.
- Path matching is exact (`slots[pathname]`), so a trailing slash or renamed guide
  silently loses its slot even though the page remains allowlisted. `default`/`*`
  covers it only if configured.

**Formalisation value:** medium; mostly an operator visibility problem.

---

### SM-19 — Rate-limit windows

**States per key:** `absent` → `counting` → `window-expired` (reset to 1 on next hit).

**Transitions**
- Worker: one atomic upsert into `rate_limits`, `count > max` → `429 + Retry-After`
  (`worker/http.js:28-39`). A 1-in-100 request triggers deletion of expired rows.
- Express: in-memory `Map`, fixed window, hard cap of 10 000 entries; if full of live
  entries it fails closed with a 429 (`server/limits.js:8-23`).

**Invariants**
- Keys are hashed where they contain IPs or emails.
- The window is fixed, not sliding; a burst across a boundary can double the allowance.

**Failure modes**
- Cleanup is probabilistic; expired rows can linger and the table can grow between
  cleanup hits.
- `dedupeView` shares the same table and cleanup, so view dedupe rows are also only
  removed opportunistically.
- Express and Worker have different failure behaviour at capacity (fail-closed vs
  best-effort cleanup). Acceptable for different deployment sizes, but it is a
  behavioural divergence.

**Formalisation value:** low; standard fixed-window semantics.

---

### SM-20 — Host and cutover redirects

**States per request:** `plaintext` → `https` → `canonical | served-in-place`,
gated by `DOMAIN_CUTOVER_ENABLED` for the legacy host.

**Transitions** (`shared/host-policy.js:55-118`)
- Any `http:` on apex/www/legacy upgrades to `https:` and then applies the canonical
  target in one hop.
- `www.popuploom.com` always redirects to the apex (regardless of the cutover flag).
- The legacy `workers.dev` host redirects only when the cutover flag is true, and only
  for the explicit `LEGACY_PAGES` map.
- `/popuploom.js`, `/popforge.js`, `/api/*`, `/assets/*`, `/migration.html`,
  `/reset-password.html`, robots and sitemap are never redirected.

**Invariants**
- Direct-response paths never cross a host, so fragments and embeds survive.
- Unknown paths are not redirected to the homepage.

**Failure modes**
- The cutover flag is a global boolean with no staged rollout and no per-path state.
  Flipping it is atomic and immediate.
- `www` and legacy follow different rules; a future host addition needs edits in
  three sets.

**Formalisation value:** low-medium; the rules are already tabular.

---

### SM-21 — Leads inbox paging and export

**States:** `idle` → `loading` → `loaded | error`, with `exporting` and `cancelled`
as orthogonal flags.

**Transitions** (`leads.js:7-15`)
- `busy` guards load; `exporting` guards export; both disable the same controls.
- Cursor is the last row id; "more" is hidden when a batch is short.
- Export pages at 500, aborts on session change, on a stalled cursor, or on user
  cancel; each request has a 20 s timeout.
- `storage` events on `pf.token` abort in-flight work and reset the table.

**Invariants**
- A stale session never mixes data from two accounts.
- A non-advancing cursor stops the export rather than looping forever.
- CSV is generated client-side from already-authorized rows.

**Failure modes**
- The token captured at page load is compared to the live token; a token refresh
  (re-login in another tab) aborts the export rather than retrying, which is safe but
  looks like a failure.
- `page()` aborts its own fetch on a 20 s timer; a large page on a slow link is
  treated as a failure with no partial-progress resume.

**Formalisation value:** medium; the export is a genuine multi-step machine.

---

### SM-22 — Manual legacy recovery page

**States:** `unreadable | empty | found` → `downloaded`.

**Transitions** (`migration.html:48-110`)
- Reads `pf.widgets` once, validates each entry (`cfg` must be an object), caps at 200,
  counts skipped entries, renders names, and offers a JSON download.
- It never mutates storage.

**Invariants**
- Invalid entries are left untouched, not deleted.
- No network call, so it works even if the old host is gone.

**Failure modes**
- One-shot read: if the page is opened before the old site's data exists, it reports
  empty and offers nothing.
- There is no import step here; the user must take the file to the dashboard.

**Formalisation value:** low.

---

## 6. Cross-machine findings, ranked

| # | Severity | Finding | Evidence | Why it matters | Status 2026-11-14 |
|---|----------|---------|----------|----------------|-------------------|
| 1 | **P1** | Express view dedupe trusts `x-visitor-id`; Worker ignores it | `server/routes/widgets.js`, `worker/http.js` | The two deployments enforce different anti-inflation rules; the Express one is bypassable by a header. | **Fixed** — Express uses `req.ip`. |
| 2 | **P1** | Unknown/deleted widget on submit returns `202 stored:false`, client loops on "try again" | `worker/widgets.js`, `popuploom.js` | Visitors on a site with a removed embed are stuck in a permanent error state. | **Fixed** — terminal `_unavailable` state. |
| 3 | **P1** | Expired verification link has no resend path; re-register sends "account exists" | `worker/index.js`, `shared/email.js` | A legitimate unverified user can only recover via password reset. | **Fixed** — enumeration-safe resend endpoint + UI. |
| 4 | **P2** | Studio has no dirty flag or unload guard | `studio.js` | Silent loss of unsaved work; "Saved" can refer to a stale snapshot. | **Fixed** — dirty flag, version-aware save, unload guard. |
| 5 | **P2** | Guest `putSubmission` still writes PII to `pfsubs.<id>` while runtime deletes it | `app.js`, `popuploom.js` | Dead code with a dangerous shape; one future caller reintroduces the leak. | **Fixed** — guest path no longer writes PII. |
| 6 | **P2** | Webhook deliveries have no `pending` state and no durable retry | `shared/webhook.js`, `worker/widgets.js` | The schema overstates reliability; crashes are invisible. | **Partially fixed** — pending rows + stale sweep; durability (F-08) remains open. |
| 7 | **P2** | Ad config fails closed but silently | `shared/ads.js` | An env typo can stop revenue with no operator signal. | **Fixed** — one warning per distinct reason. |
| 8 | **P2** | `getWidgetConfig` comment promises 30 s cache, code sends `no-store` | `worker/widgets.js` | Comment/code drift invites a future "fix" that reintroduces stale configs after delete. | **Fixed** — comment corrected. |
| 9 | **P2** | Guest view counter is written but never read (`Store.views()` returns 0) | `app.js`, `popuploom.js` | Dead state that grows forever and misleads future work. | **Fixed** — guest dashboard reads `pfview.<id>`. |
| 10 | **P3** | Age gate stores `minAge: 18` while site copy de-emphasises age thresholds | `studio.js` | Config and policy can drift apart. | Open — product decision, not a defect. |
| 11 | **P3** | `destroy()` records a "closed" timestamp | `popuploom.js` | Programmatic teardown suppresses future shows under `close24h`. | **Fixed** — `destroy()` closes with `persist:false`. |
| 12 | **P3** | `www` redirects always; legacy host only behind a flag | `shared/host-policy.js` | Asymmetric rules are easy to misread during a cutover. | Open — deliberate cutover policy. |

---

## 7. What is missing, not just implicit

These are states the product implies but never models:

1. **Resend verification** — endpoint and UI added 2026-11-14.
2. **Widget availability in the embed** — terminal `_unavailable` state added
   2026-11-14; the runtime now distinguishes "deleted" from "temporary failure".
3. **Studio dirty/saved persistence** — dirty state and unload guard added
   2026-11-14; it is still in-memory, not a persisted draft.
4. **Webhook in-flight/abandoned** — `pending` rows added 2026-11-14; a durable
   retry queue is still missing.
5. **Ad serving health** — fail-closed reasons are now logged once each; there is
   still no "enabled but unfilled" signal.
6. **A guest draft's identity** — cross-tab migration lock added 2026-11-14; there
   is still no stable client id for drafts.

---

## 8. Recommended order if these are formalised

1. **SM-14 (lead submission)** — highest user and customer impact; add a terminal
   `unavailable` outcome and keep the retry id across reloads.
2. **SM-06/SM-08/SM-09 (widget + studio)** — one `draft | saved | deleted` model,
   one dirty flag, one publish view.
3. **SM-02 (verification)** — add `resend` without weakening enumeration safety.
4. **SM-13 (dedupe)** — make Express and Worker share one key function.
5. **SM-17 (webhooks)** — add a `pending` row before the first attempt.
6. **SM-18 (ads)** — surface the computed `reason` on an internal status page or log.

Everything else is already close enough to a table that naming it is documentation,
not redesign.

---

## 9. Limitations of this inventory

- No production traces were inspected; transitions that depend on platform timing
  (`waitUntil`, isolate eviction, CMP behaviour) are inferred from code and docs.
- The Express and Worker copies were compared where the summary flagged divergence;
  other subtle drift may exist and would be caught by a behavioural parity test, not
  by reading.
- This document does not propose schema changes, endpoints or UI work. It is a map,
  not a migration plan.
