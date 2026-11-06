# Incident response

Updated: 2026-11-07

This is a small independent project. There is no 24/7 security operations centre and no guaranteed response time.

## Contacts

- Security reports: `security@popuploom.com` (subject `PopupLoom security report`)
- Public policy: `https://popuploom.com/security.html`

## Severity

| Level | Examples | Target |
| --- | --- | --- |
| Critical | Active auth bypass, cross-tenant lead access, malicious embed code, exposed production secret | Contain immediately; notify affected owners as required |
| High | Stored XSS, SSRF to internal metadata, account takeover, webhook secret exposure | Contain within 24 hours where feasible |
| Medium | Rate-limit bypass, enumeration, missing authorization on a low-impact route | Fix in the next release |
| Low | Missing header, weak cookie attribute, informational finding | Schedule |

Targets are best effort, not contractual.

## Detection sources

- User report to the security address.
- GitHub Actions failure or dependency advisory.
- Cloudflare alerts, DNS/TLS expiry, provider warning.
- Unexpected change to the deployed `popuploom.js` hash.
- Uptime/error monitor (planned).
- Manual review.

## Response sequence

1. **Acknowledge and classify.** Record reporter, time, affected URL and initial severity.
2. **Preserve evidence.** Save logs, deployed asset hash, request IDs and relevant database rows. Do not copy personal data unnecessarily.
3. **Contain.** Revoke tokens/secrets, disable the affected route or widget, block the abusive origin, or roll back the deployment.
4. **Investigate.** Identify root cause and blast radius. Check whether leads, accounts or customer sites were affected.
5. **Eradicate.** Remove malicious code, patch the route, rotate credentials.
6. **Recover.** Deploy the fix, verify health, verify the embed checksum and run regressions.
7. **Notify.** Inform affected owners where required. Do not disclose another user's data.
8. **Review.** Write a short post-incident record: timeline, impact, root cause, fix, prevention.
9. **Close.** Confirm monitoring and add a regression test.

## Credential rotation

- Cloudflare API token: revoke and reissue in GitHub secrets.
- `JWT_SECRET`: rotate after forcing token invalidation; all users must sign in again.
- `RESEND_API_KEY`: revoke in Resend and set a new Worker secret.
- Google client: rotate the OAuth client secret if one is used.
- Webhook secrets: rotate per widget.

## Evidence to capture for this project

```text
UTC timestamp
Affected URL/endpoint/widget id
Deployed commit and embed version/hash
Request ID or Cloudflare Ray ID
Relevant status codes (never full credentials)
Whether personal data was accessed
Actions taken and by whom
```

## Post-incident record template

```text
Incident:
Severity:
Detected by / at:
Affected systems:
Root cause:
Impact:
Containment:
Fix commit:
Credential rotation:
User notification:
Regression test added:
Follow-up owner/date:
```

## Current gaps

- No automated paging/alerting.
- No formal on-call rotation.
- No tested backup restore.
- No incident register yet; this file is the template.
