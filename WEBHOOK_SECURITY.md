# Webhook security

Updated: 2026-11-07

PopupLoom has two webhook paths. They have different trust levels.

## Browser webhook (owner-configured, public)

- Configured inside the popup form as `content.form.webhookUrl`.
- Delivered by the visitor's browser with `mode: "no-cors"` and `text/plain`.
- The URL is visible in public widget configuration and to every visitor.
- It must never contain API keys, passwords or private tokens.
- Delivery is best effort; the browser cannot read the response and there is no retry.
- Use it only for a public endpoint that tolerates anonymous posts.

## Server-side webhook (recommended)

- URL and signing secret live in `webhook_endpoints`, separate from public widget config.
- Owner-only GET/PUT/DELETE under `/api/widgets/<id>/webhook`.
- Signed with HMAC-SHA256 over `timestamp.body`.
- Headers:
  - `X-PopupLoom-Event`
  - `X-PopupLoom-Delivery`
  - `X-PopupLoom-Timestamp`
  - `X-PopupLoom-Signature: t=<unix>,v1=<hex>`
- Delivery does not follow redirects.
- Transient failures (network, timeout, 408, 429, 5xx) retry up to three attempts.
- Delivery logs store status, attempts, response status and a bounded error string; they do not store the request body or the secret.
- The newest 100 delivery records per widget are retained.

## URL validation (SSRF)

`validateUrl()` rejects:

- non-HTTPS URLs (unless explicitly enabled for local development);
- embedded credentials;
- loopback, private, link-local, multicast and reserved literal addresses;
- decimal, hex, octal and non-canonical IPv4 forms;
- IPv6 loopback, unique-local, link-local, multicast and IPv4-mapped private addresses;
- `.local`, `.internal` and cloud metadata hostnames.

`validateUrlResolved()` additionally:

- resolves the hostname through an injected resolver;
- rejects any resolved private/reserved address;
- fails closed when DNS fails;
- skips resolution only for an explicitly allowed loopback in local development.

The Worker uses Cloudflare DNS-over-HTTPS. Express uses `node:dns` with all addresses.

`deliver()` re-runs the resolved check immediately before every attempt, so a DNS answer that changes after save is checked again.

## Residual risk

DNS rebinding between our validation lookup and the HTTP client's own lookup is reduced but not completely eliminated. Closing it fully requires an egress proxy, a pinned-IP connector, or a platform primitive that lets us connect to the validated address while preserving TLS SNI. This is documented as residual risk in `SECURITY_AUDIT.md`.

## Secrets

- Server-side secrets are 32 random bytes, hex-encoded.
- Secrets are returned only to the authenticated owner.
- Secret rotation is available.
- Secrets are never included in public config, HTML attributes, JavaScript bundles or browser storage.
- Secrets are not logged.

## Receiver guidance

1. Verify the HMAC with the shared secret over `timestamp.body`.
2. Reject timestamps outside a short tolerance (for example five minutes).
3. Deduplicate on `X-PopupLoom-Delivery`.
4. Respond 2xx quickly; process asynchronously.
5. Do not trust the payload without signature verification.

## Tests

- `webhook URL validation blocks insecure and private destinations`
- `webhook DNS validation blocks hostnames that resolve to private addresses`
- `webhook delivery retries transient failures and stops on 4xx`
- `lead webhooks deliver once, sign payloads, log attempts and stay private`
- Worker integration webhook test: signature, retry, own-vs-other account, private address rejection.

## Not yet implemented

- Durable queue/outbox and dead-letter replay.
- Destination ownership verification handshake.
- Per-endpoint rate limit independent of the global submit limit.
