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
| `Content-Signal` in `robots.txt` | Same preference for crawlers that read robots only | text |
| `Agentmap` in `robots.txt` | Points at the ARD manifest | text |

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
| Markdown for Agents | Supported by Cloudflare at the zone level, not in origin code. Toggle in **Cloudflare dashboard → Agent Readiness → Markdown for Agents**. Until then the site returns HTML only. |

## Markdown for Agents (owner action)

Cloudflare converts HTML to `text/markdown` at the edge when a client sends
`Accept: text/markdown`. It is a zone setting:

- Dashboard: **Agent Readiness → Markdown for Agents → Serve Markdown to AI agents**
- API: `PATCH /client/v4/zones/{zone}/settings/content_converter` with `{"value":"on"}`
  (needs a token with Zone Settings edit)

No origin change is required. If enabled, Cloudflare preserves the `Link` and
`Content-Signal` headers on the converted response.

## Verification

```powershell
curl.exe -sI https://popuploom.com/ | Select-String -Pattern "link|content-signal"
curl.exe -s https://popuploom.com/.well-known/api-catalog
curl.exe -s https://popuploom.com/.well-known/ard.json
curl.exe -s https://popuploom.com/openapi.json
curl.exe -s https://popuploom.com/robots.txt
```

`tests/worker-test.js` asserts the catalog, manifest, OpenAPI document, `Link`
header, `Content-Signal` header and `robots.txt` directives on every run.
