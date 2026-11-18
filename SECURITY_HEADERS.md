# Security headers

Updated: 2026-11-07

Both runtimes apply the same intent. The Worker is the production runtime; Express is the local/alternate runtime.

## HTML responses

| Header | Value | Purpose |
| --- | --- | --- |
| `Content-Security-Policy` | `default-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' 'unsafe-hashes' https://accounts.google.com/gsi/ https://static.cloudflareinsights.com <per-page sha256 hashes>; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com/gsi/; font-src 'self' https://fonts.gstatic.com; img-src 'self' https: http: data:; connect-src 'self' https://accounts.google.com/gsi/ https://cloudflareinsights.com <APP_ORIGINS>; frame-src https://accounts.google.com/gsi/ https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com` | Blocks injected scripts and event handlers, framing, object embedding, base-URL changes and form posts to other origins. Inline scripts and handlers are allowed only by SHA-256 hash. No `unsafe-eval`. |
| `X-Frame-Options` | `DENY` | Clickjacking defence for older browsers. |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME sniffing. |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limits path leakage to other origins. |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Disables unneeded browser capabilities. |
| `Strict-Transport-Security` | `max-age=31536000` on HTTPS | Enforces HTTPS for one year. |
| `Cache-Control` | `no-store` for HTML and source files; `public, max-age=31536000, immutable` for `/embed/<version>/` | Prevents stale HTML while allowing a pinned embed to cache. |

`style-src` still allows inline styles because the studio writes generated theme values to a style attribute. `img-src` allows `https:`, `http:` and `data:` because customers may use remote images and the editor accepts limited data-image formats. These are documented trade-offs, not oversights.

## API responses

API responses receive `X-Content-Type-Options`, `Referrer-Policy`, HSTS over HTTPS and `Cache-Control: no-store`. They do not need a document CSP.

CORS:

- Public widget endpoints (`/config`, `/view`, `/submit`) and `/api/health` are cross-origin by design.
- Private API routes reject an untrusted `Origin` with 403.
- Bearer authorization is still required for owner data; CORS is not authorization.

## Embed responses

`/embed/<version>/popuploom.js` is served with:

```text
Cache-Control: public, max-age=31536000, immutable
```

The `/popuploom.js` alias remains `no-store` so a compatibility path never pins a stale script unexpectedly.

## 404 responses

The 404 page receives the same HTML CSP, `X-Frame-Options: DENY`, `X-Content-Type-Options` and `X-Robots-Tag: noindex`. A missing page cannot become a weaker execution context.

## Verification

```bash
curl -sSI https://popuploom.com/ | grep -iE 'content-security|strict-transport|x-frame|x-content|referrer|permissions'
curl -sSI https://popuploom.com/security.html | grep -i 'content-security'
curl -sSI https://popuploom.com/embed/1.1.0/popuploom.js | grep -i 'cache-control'
```

Regression tests assert:

- per-page CSP hashes and line-ending normalization;
- absence of `unsafe-inline` in `script-src`;
- `frame-ancestors 'none'`, `base-uri 'none'`, `object-src 'none'`;
- 404 responses keep CSP;
- immutable cache headers for the versioned embed.

## Known gaps

- HSTS has no `includeSubDomains` or `preload`.
- No `Cross-Origin-Opener-Policy` or `Cross-Origin-Resource-Policy`.
- `img-src` is broad.
- These are Low-priority hardening items and are listed in `SECURITY_AUDIT.md` (F-14).
