# Automatic deployment

Automatic deployment is configured for the private `Shailu016/popuploom` repository. Every push to `main` runs the tests and deploys the PopupLoom build if they pass. Manual deployment is also available through the **Test and deploy to Cloudflare** workflow.

The repository is now named `popuploom` to match the product. The Worker service, D1 database, CI token and workflow names keep the names they were created with; they are infrastructure names, not visible branding.

Workflow: `.github/workflows/deploy-cloudflare.yml`. It installs locked dependencies, checks Worker integration and unit tests, and runs application/browser regressions before deployment. Production releases run sequentially. Repository permissions are read-only, official actions are pinned to commit hashes, and the deployment credential is available only in the deployment step.

Destination: the `shailu3597@gmail.com` Cloudflare account (`66d3b261587ce5aeb4849141b6cca30d`). Both custom domains are attached to the existing Worker and declared in `wrangler.toml` with the exact zone ID. CI verifies apex API health and byte-identical legacy/new runtimes after deployment. Legacy browser redirects are explicitly enabled after the new build passed live verification.

The dedicated deploy token is stored as the encrypted repository Actions secret `CLOUDFLARE_API_TOKEN`. It is restricted to this Cloudflare account, with Workers Scripts: Edit and Account Settings: Read. It has no expiration; revoke or rotate it through Cloudflare API Tokens if access is no longer needed. It cannot create zones or change DNS. Never commit the token, copy a personal Wrangler OAuth credential into CI, or paste credentials into chat. Existing application secrets remain in Cloudflare; `JWT_SECRET` is not rotated by a rebrand.

Password reset email needs one additional Cloudflare secret, `RESEND_API_KEY` (`wrangler secret put RESEND_API_KEY`). The non-secret `RESET_EMAIL_FROM` and `PUBLIC_ORIGIN` values live in `wrangler.toml` `[vars]`. The workflow does not create or rotate those values; configure them once per Cloudflare account and verify `popuploom.com` in Resend with SPF and DKIM before enabling production mail. The Resend free plan allows 3,000 emails/month and 100/day.

Verified on 2026-11-01: all tests, production deployment, and live health verification passed in https://github.com/Shailu016/popuploom/actions/runs/41303371404. That run is the pre-rebrand baseline.

Schema migrations and customer-data imports are not executed automatically. Review and apply migrations separately using the existing deployment instructions. No paid plan or billing upgrade was enabled by this setup; GitHub Actions and Cloudflare account allowances still apply.

## Domain redirects

The shared policy moves `www` browser pages to the apex and upgrades plaintext requests in one hop. Runtime, API and asset paths are never redirected. The workers.dev address is disabled (`workers_dev = false`), so only the custom domains serve the site.

First rebrand release verified: https://github.com/Shailu016/popuploom/actions/runs/41374596216 . The same main-push pipeline checks apex API health and that the current runtime alias matches the newest immutable release.
