# Agent discovery (AI-ready surface)

Status: **live 2026-11-12**. Covers the findings in the `isitagentready.com` scan.

Rule used for every item: **advertise only services that exist**. A discovery file that
points at a missing MCP server, OAuth server or payment endpoint is a false claim, and
false claims are worse than a missing optional file.

## What is published

| Resource | Purpose | Format |
|---|---|---|
| `/.well-known/api-catalog` | RFC 9727 API catalog | `application/linkset+json` |
| `/openapi.json` | OpenAPI 3.1 description of the public embed API | `application/json` |
| `/.well-known/ard.json` | Agentic Resource Discovery manifest (ARD v0.91) | `application/json` |
| `/.well-known/ai-catalog.json` | ARD predecessor path, kept as a compatibility alias | `application/json` |
| `Link` response header on HTML | RFC 8288 discovery links | header |
| `Content-Signal` response header | Reuse preferences after access | header |

`Content-Signal` and the ARD manifest used to be repeated inside `robots.txt`. They
are not any more: both directives are non-standard, sat outside a `User-agent`
group, and made strict parsers reject the file. The header is the only channel for
the reuse preference; the manifest is discovered through the `Link` header and the
well-known paths.

Header value sent on every page:

```http
Link: <https://popuploom.com/.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json",
      <https://popuploom.com/.well-known/ard.json>; rel="ard"; type="application/json",
      <https://popuploom.com/llms.txt>; rel="describedby"; type="text/plain",
      <https://popuploom.com/guides/install-popups.html>; rel="service-doc"; type="text/html"
Content-Signal: ai-train=yes, search=yes, ai-input=yes
```

## What the catalog describes

Only the unauthenticated endpoints the embed runtime actually uses:

- `GET /api/health`
- `GET /api/widgets/{widgetId}/config`
- `POST /api/widgets/{widgetId}/view`
- `POST /api/widgets/{widgetId}/submit`

Owner-only endpoints (accounts, editor, leads, webhooks) are deliberately not
described: they need a bearer session token and are not for automated third-party use.

## What is deliberately NOT published

| Finding | Why not |
|---|---|
| OAuth / OIDC discovery | PopupLoom is not an OAuth authorization server. Sign-in delegates to Google Identity Services. Publishing `authorization_endpoint`/`token_endpoint` would be fabricated. |
| OAuth Protected Resource Metadata | Same reason: no OAuth resource server exists. |
| `auth.md` / agent registration | There is no agent registration flow. Humans sign up with email or Google. |
| MCP Server Card | No MCP server is run. |
| Agent Skills index | No agent skills are published. |
| WebMCP tools | No authentication-free browser action is safe to expose; `registerTool()` would also be inert until browsers ship the API. |
| x402, MPP, UCP, ACP | The product is free and has no paid API. Adding payment discovery would misrepresent it. |
| DNS-AID (`_index._agents`, `_a2a._agents`) | There is no A2A agent or index endpoint to bind to. SVCB records pointing nowhere are noise; the draft spec is also unstable. |
| Markdown for Agents | **Implemented at the origin.** Cloudflare's native toggle requires a Pro plan; this zone is Free. The Worker and Express server convert public HTML pages to `text/markdown` when the request sends `Accept: text/markdown`, set `Vary: Accept`, and leave HTML as the default. Private/app pages stay HTML-only. |

## Markdown for Agents

Cloudflare's native **Agent Readiness → Markdown for Agents** toggle requires a Pro
plan. This zone is on Free, so the feature is implemented at the origin instead:

- Public HTML pages return `text/markdown; charset=utf-8` when the request sends
  `Accept: text/markdown`, with `Vary: Accept`.
- HTML remains the default for browsers and for `Accept: text/html`.
- `/studio.html`, `/profile.html`, `/leads.html`, `/reset-password.html`,
  `/verify-email.html` and `/migration.html` stay HTML-only.
- Conversion is conservative: title/description frontmatter, headings, paragraphs,
  lists, links (absolute), inline code, fenced code, tables, images, blockquotes.
  Scripts, styles, navigation, headers, footers and forms are removed.
- No ads are injected into markdown responses.

Test:

```bash
curl -s https://popuploom.com/guides/wordpress-popup.html \
  -H "Accept: text/markdown" | head -20
curl -sI https://popuploom.com/guides/wordpress-popup.html \
  -H "Accept: text/markdown" | findstr /i "content-type vary"
```

If the zone is upgraded to Pro later, decide whether to switch to Cloudflare's
converter or keep the origin implementation. Do not enable both blindly; the
origin version is the source of truth today.

## Scan result (2026-11-13)

The `isitagentready.com` scan now reports **Level 4 — Agent-Integrated**.

Passing:

- `robotsTxt`, `sitemap`, `linkHeaders`
- `markdownNegotiation`
- `robotsTxtAiRules`, `contentSignals`
- `apiCatalog`, `ard`

Still failing, all because the matching service does not exist:

- `dnsAid` — no A2A/MCP index endpoint to bind
- `webBotAuth` — informational; no signed-agent directory
- `oauthDiscovery`, `oauthProtectedResource` — no OAuth server
- `authMd`, `mcpServerCard`, `a2aAgentCard`, `agentSkills`, `webMcp`, `personalAgentProtocol`
- commerce: `x402`, `mpp`, `ucp`, `acp`, `ap2` — product is free

Do not publish metadata for those without building the service. The level is a
checklist position, not a security or SEO score.

## Verification

```powershell
curl.exe -sI https://popuploom.com/ | Select-String -Pattern "link|content-signal"
curl.exe -s https://popuploom.com/.well-known/api-catalog
curl.exe -s https://popuploom.com/.well-known/ard.json
curl.exe -s https://popuploom.com/openapi.json
curl.exe -s https://popuploom.com/robots.txt
```

`tests/worker-test.js` asserts the catalog, manifest, OpenAPI document, `Link`
header and `Content-Signal` header on every run, and that `robots.txt` stays a
plain file whose first directive is a `User-agent` group.
