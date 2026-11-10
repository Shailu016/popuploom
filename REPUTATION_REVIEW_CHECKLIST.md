# Reputation review checklist

Updated: 2026-11-07

This is the evidence pack for correcting the Gridinsoft/SOCRadar phishing classification. Do not send it until the fixes in `SECURITY_REMEDIATION.md` are live.

## Current evidence

| Item | Value |
| --- | --- |
| Gridinsoft report | `https://gridinsoft.com/online-virus-scanner/url/popuploom-com` |
| Gridinsoft date | 2026-11-02 18:50 |
| Gridinsoft classification | Phishing |
| Gridinsoft trust score | 1/100 |
| Gridinsoft external source | SOCRadar (one external warning) |
| Domain registration | 2026-11-01 (RDAP), transfer lock enabled |
| Google Search Console security issues | No issues detected |
| Google Search Console manual actions | No issues detected |
| Safe Browsing transparency | No unsafe-content flags returned at audit time |
| URLScan scans | 8 studio-template scans, 2026-11-02 10:34–11:54 UTC |
| URLScan tags | `@ecarlesi,possiblethreat,phishing` |
| URLScan labels/verdict | Empty |
| One scanned URL | `https://popuploom.com/studio.html?tpl=blank` |
| VirusTotal | HTTP 429 at audit time; not verified |
| SOCRadar portal | Not available without an account |

## Requests sent

On 2026-11-07, the evidence summary was sent from the monitored Gmail account to:

- `support@urlscan.io` — review of the eight user-applied tags;
- `contact@socradar.io` — request for the exact detection/evidence and re-evaluation;
- `legal@gridinsoft.com` — re-evaluation request and owner-portal guidance.

No response or verdict change had been observed when this file was updated. Follow up once after 7–10 business days; do not send repeated requests.

## What to send

- Domain name and canonical URL.
- The exact warning text and provider.
- The date(s) of the report.
- Google Search Console screenshots showing no security issues and no manual actions.
- URLScan result URLs and the fact that labels/verdict are empty.
- The `tpl=blank` scan as evidence of indiscriminate tagging.
- The remediation summary: security page, webhook DNS validation, no lead PII in browser storage, stronger password hashing, versioned embed, SPF/CAA, explicit deletion.
- A request for the exact detected URL, classification reason, detection date, evidence and re-evaluation.
- A contact address that is monitored.

Do **not** send passwords, user data, session tokens or unredacted logs.

## URLScan

1. Identify the submitter `@ecarlesi` and the eight result URLs.
2. Use URLScan's official contact/report channel.
3. State that the tags were user-applied; the scan labels and verdict are empty.
4. Point out that `tpl=blank` cannot be a credential-theft page.
5. Ask for tag removal/reclassification or an explanation.
6. Record the response.

## SOCRadar

1. Use the official reporting/contact channel; do not guess an email.
2. Request the exact URL, category, detection date and evidence.
3. Provide the Google Search Console and URLScan evidence.
4. Ask for re-evaluation after the fixes.
5. Record the case/reference number.

## Gridinsoft

1. Claim the domain profile through `portal.gridinsoft.com`. **Done 2026-11-10** — domain verified with the `gridinsoft-key` meta tag.
2. Add verified operator/contact details. **Done** — profile tied to the verified domain.
3. Request re-evaluation with the same evidence. **Ticket `GS-E7485CEE38ED` opened 2026-11-10.**
4. Site changes made before the appeal:
   - removed all explicit "18+" / "21+" wording from public pages and templates (the report listed "18+" and "adult material");
   - added "what PopupLoom never asks for" statements to `/about.html` and `/security.html`;
   - verified no payment-card, bank-credential, one-time-code or Google-password requests exist.
5. **Outcome 2026-11-10:** Gridinsoft removed its Phishing detection. Report is now **Inconclusive, 53/100**, because the editor lets users configure their own links and form destinations; they did not find a phishing URL or require a site change.
6. Remaining separate warnings named by Gridinsoft: **SOCRadar** and **Norton**.
   - Norton false-positive dispute submitted 2026-11-10; review within 48 business hours.
   - SOCRadar: email-only process; need a request from a monitored domain address to `contact@socradar.io` / `vt@socradar.io` with the VirusTotal scan URL.
7. Public report: `https://gridinsoft.com/online-virus-scanner/url/popuploom-com`.

## Follow-up cadence

- One initial request.
- One follow-up after 7–10 business days.
- Do not send repeated requests after that; it does not improve the queue.
- Recheck the public report weekly.
- Update this file and `SECURITY_REMEDIATION.md` when a provider responds.

## What not to do

- Do not buy reputation services that promise removal.
- Do not spam the providers.
- Do not create fake reviews or social profiles.
- Do not claim the warning is resolved until the provider's public page changes.
- Do not hide the warning from users; the security page explains the reporting channel.

## Success criteria

- The provider either removes the classification or explains the specific evidence.
- Google Search Console remains free of security/manual issues.
- URLScan tags no longer describe the domain as phishing.
- The domain's public facts are consistent across the site, press kit, `llms.txt` and directory profiles.
