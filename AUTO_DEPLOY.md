# Automatic deployment

Automatic deployment is configured for the private `Shailu016/popforge` repository. Every push to `main` runs the tests and deploys the PopupLoom build if they pass. Manual deployment is also available through the **Test and deploy to Cloudflare** workflow.

Repository, folder, Worker service and workflow names retain the original `popforge` identifier; they are infrastructure names, not visible branding.

Workflow: `.github/workflows/deploy-cloudflare.yml`. It installs locked dependencies, checks Worker integration and unit tests, and runs application/browser regressions before deployment. Production releases run sequentially. Repository permissions are read-only, official actions are pinned to commit hashes, and the deployment credential is available only in the deployment step.

Destination: the `shailu3597@gmail.com` Cloudflare account (`66d3b261587ce5aeb4849141b6cca30d`). Both custom domains are attached to the existing Worker and declared in `wrangler.toml` with the exact zone ID. CI verifies apex API health and byte-identical legacy/new runtimes after deployment. Legacy browser redirects are explicitly enabled after the new build passed live verification.

The dedicated deploy token is stored as the encrypted repository Actions secret `CLOUDFLARE_API_TOKEN`. It is restricted to this Cloudflare account, with Workers Scripts: Edit and Account Settings: Read. It has no expiration; revoke or rotate it through Cloudflare API Tokens if access is no longer needed. It cannot create zones or change DNS. Never commit the token, copy a personal Wrangler OAuth credential into CI, or paste credentials into chat. Existing application secrets remain in Cloudflare; `JWT_SECRET` is not rotated by a rebrand.

Verified on 2026-11-01: all tests, production deployment, and live health verification passed in https://github.com/Shailu016/popforge/actions/runs/41303371404. That run is the pre-rebrand baseline.

Schema migrations and customer-data imports are not executed automatically. Review and apply migrations separately using the existing deployment instructions. No paid plan or billing upgrade was enabled by this setup; GitHub Actions and Cloudflare account allowances still apply.

## Domain redirect safety gate

Production explicitly sets `DOMAIN_CUTOVER_ENABLED = "true"` after DNS, TLS, public-page and external-embed verification. The shared policy and `.env.example` default to disabled. Runtime/API/recovery paths remain direct on the legacy host. For rollback, disable future legacy redirects while retaining the new domain and compatibility bindings because clients may have cached permanent redirects.

First rebrand release verified: https://github.com/Shailu016/popforge/actions/runs/41374596216 . The same main-push pipeline publishes the final redirect cutover and checks apex API health plus byte-identical old/new runtime responses.
