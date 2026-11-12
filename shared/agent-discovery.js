// shared/agent-discovery.js — machine-readable discovery metadata for AI agents.
// One source of truth for the origin-level files and the HTTP headers that
// advertise them. Used by the Cloudflare Worker (ESM import) and the Express
// server (CommonJS require).
//
// Everything here describes resources that actually exist on this site:
//   /.well-known/api-catalog     RFC 9727 API catalog (application/linkset+json)
//   /.well-known/ard.json        Agentic Resource Discovery manifest (ARD v0.91)
//   /.well-known/ai-catalog.json ARD predecessor path, kept as a compatibility alias
//   /openapi.json                OpenAPI 3.1 description of the public embed API
//   /llms.txt                    Human- and agent-readable product summary
//   /guides/install-popups.html  Installation documentation
//   /api/health                  Public status endpoint
//
// No MCP server, A2A agent, OAuth authorization server or payment endpoint is
// advertised, because none exists. Publishing metadata for a non-existent
// service would be a false claim, not a discovery improvement.

const ORIGIN = "https://popuploom.com";

// Content Signals (contentsignals.org): preferences for reuse after access.
// This site is public marketing and documentation content and wants AI systems
// to be able to read, quote and learn from it.
const CONTENT_SIGNAL = "ai-train=yes, search=yes, ai-input=yes";

// RFC 8288 Link header. Only registered/standard relation types:
//   api-catalog  — RFC 9727
//   ard          — Agentic Resource Discovery
//   describedby  — RFC 8288 registered
//   service-doc  — RFC 8288 registered
const LINK = [
  `<${ORIGIN}/.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json"`,
  `<${ORIGIN}/.well-known/ard.json>; rel="ard"; type="application/json"`,
  `<${ORIGIN}/llms.txt>; rel="describedby"; type="text/plain"`,
  `<${ORIGIN}/guides/install-popups.html>; rel="service-doc"; type="text/html"`
].join(", ");

const API_CATALOG = {
  linkset: [
    {
      anchor: `${ORIGIN}/api`,
      "service-desc": [
        {
          href: `${ORIGIN}/openapi.json`,
          type: "application/json",
          title: "PopupLoom public embed API (OpenAPI 3.1)"
        }
      ],
      "service-doc": [
        {
          href: `${ORIGIN}/guides/install-popups.html`,
          type: "text/html",
          title: "Install a PopupLoom popup on your site"
        }
      ],
      status: [
        {
          href: `${ORIGIN}/api/health`,
          type: "application/json",
          title: "Public health endpoint"
        }
      ]
    }
  ]
};

const ENTRIES = [
  {
    identifier: "urn:air:popuploom.com:api:embed",
    displayName: "PopupLoom embed API",
    type: "application/vnd.oai.openapi+json",
    url: `${ORIGIN}/openapi.json`,
    description:
      "Public, unauthenticated HTTP API used by embedded popups: read a published popup configuration, record a view, and submit a captured lead.",
    capabilities: ["readWidgetConfig", "recordView", "submitLead"],
    representativeQueries: [
      "fetch the configuration for a PopupLoom popup",
      "record a view for an embedded popup",
      "submit a lead captured by a popup form"
    ]
  }
];

module.exports = { ORIGIN, CONTENT_SIGNAL, LINK, API_CATALOG, ENTRIES };
