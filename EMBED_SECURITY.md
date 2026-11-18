# Embed runtime security

Updated: 2026-11-07
Runtime: `popuploom.js` 1.2.0 (current); 1.1.0 frozen

## Install contract

A saved widget produces two lines:

```html
<div data-popuploom="wan_<server-generated-id>"></div>
<script src="https://popuploom.com/embed/1.2.0/popuploom.js"></script>
```

- The widget id is public and is not an authentication token.
- The script derives the API origin from its own `src`, unless a documented `data-api` or `window.POPUPLOOM_API` override is present.
- The config is fetched from `/api/widgets/<id>/config` and cached for the page lifetime.
- Editing the popup changes the hosted config, not the script URL.

## Versioning and integrity

- `/embed/1.2.0/popuploom.js` is the current release and is immutable for the life of that version.
- `/embed/1.1.0/popuploom.js` is frozen: its exact bytes live in `embed-releases/1.1.0/` and the build fails if they change (sha256 `d452116065ed9181726309d96306665ae1d6c95dce9bffe5ea22922ab6e50ac5`). The WordPress plugin and the npm integration still pin 1.1.0.
- Each version directory publishes `SHA256SUMS` for `popuploom.js`.
- `/popuploom.js` is a mutable alias of the current release; never put SRI on it.
- A future release must use a new version directory. Do not overwrite a published version.
- Customers who pin a version can verify the checksum. SRI is possible for a pinned URL but must not be applied to a mutable alias.
- The current checksum is recorded in `SECURITY_REMEDIATION.md` and can be reproduced with `Get-FileHash`/`sha256sum`.

## Rendering and escaping

- All text is escaped with `esc()` before HTML insertion.
- Attribute values use `escAttr()`.
- Placement, animation, corner and field types are allowlisted.
- Colours are validated by `safeColor()`; radius is coerced to a number.
- Images and links pass through `safeUrl()`; only HTTP(S) is allowed, plus a narrow base64 image allowlist.
- Video embeds are limited to HTTPS YouTube/Vimeo hosts and use a sandboxed iframe.
- Hostile placement, theme, URL and form-field values are covered by regression tests.

## Data handling

- Submitted form responses are sent to `/submit` and are not written to the host page's `localStorage`.
- Legacy `pfsubs.*` keys are removed on load.
- The runtime stores only view state, dismissal time and frequency counters in `localStorage` under `pf.*`/`pfview.*`.
- The optional browser webhook posts to the owner-supplied URL from the visitor's browser. It is intentionally public and must not contain credentials. The signed server-side webhook is the safer integration.
- No cookies are read from the host page.
- No host form fields, passwords, payment data or unrelated cookies are accessed.
- The runtime appends its own DOM nodes and does not modify unrelated page elements.

## Failure behaviour

- If the config fetch fails, the widget clears its ready state and logs a console warning; the host page continues normally.
- If a submission fails, the form shows an inline error and keeps the entered values.
- Unknown widget ids return a quiet 202/204 and do not create attacker-controlled logs.
- API calls use a 15-second abort timeout.
- The runtime does not block host navigation or host form submissions.

## Isolation

The current runtime renders into the host DOM with a namespaced `.pf-*` style system. It does not use an iframe. This preserves the installation contract and avoids iframe height/positioning problems, but it means the popup styles share the host page's CSS cascade.

The audit recommends a future cross-origin iframe renderer with a strict `postMessage` protocol for stronger isolation. That is an architectural migration, not a small patch, and must not be introduced without a compatibility plan for existing widgets.

## Supply-chain controls

- Versioned immutable release and published checksum.
- CI runs build, unit, integration and browser regressions before deploy.
- Secret scan and production dependency audit gate the deploy.
- `Runtime.version` identifies the release.
- The hosted config path is separate from code, so content edits do not require a new script.
- Recommended next step: alert when the deployed script hash changes without a matching release commit.

## What the runtime must never do

- Read passwords, payment data or unrelated host fields.
- Read host cookies.
- Inject unrelated scripts.
- Redirect the visitor without a user action.
- Open fake browser dialogs or fake security warnings.
- Collect data outside the configured popup form.
- Pretend to be a native app or a checkout extension.
