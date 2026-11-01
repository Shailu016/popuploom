# Automatic deployment

Automatic deployment is configured for the private `Shailu016/popforge` repository. Every push to `main` runs the tests and deploys the PopupLoom build if they pass. Manual deployment is also available through the **Test and deploy to Cloudflare** workflow.

Repository, folder, Worker service and workflow names retain the original `popforge` identifier; they are infrastructure names, not visible branding.

Workflow: `.github/workflows/deploy-cloudflare.yml`. It installs locked dependencies, checks Worker integration and unit tests, and runs application/browser regressions before deployment. Production releases run sequentially. Repository permissions are read-only, official actions are pinned to commit hashes, and the deployment credential is available only in the deployment step.

Destination: the `shailu3597@gmail.com` Cloudflare account (`66d3b261587ce5aeb4849141b6cca30d`). During the domain-migration window the workflow still verifies `https://popforge.shailu3597.workers.dev/api/health`, because the apex is not attached yet. After the `popuploom.com` zone is active and the Custom Domains are verified, switch the primary health target to `https://popuploom.com/api/health` and keep a separate legacy runtime/API check.

The dedicated deploy token is stored as the encrypted repository Actions secret `CLOUDFLARE_API_TOKEN`. It is restricted to this Cloudflare account, with Workers Scripts: Edit and Account Settings: Read. It has no expiration; revoke or rotate it through Cloudflare API Tokens if access is no longer needed. It cannot create zones or change DNS. Never commit the token, copy a personal Wrangler OAuth credential into CI, or paste credentials into chat. Existing application secrets remain in Cloudflare; `JWT_SECRET` is not rotated by a rebrand.

Verified on 2026-11-01: all tests, production deployment, and live health verification passed in https://github.com/Shailu016/popforge/actions/runs/41303371404. That run is the pre-rebrand baseline.

Schema migrations and customer-data imports are not executed automatically. Review and apply migrations separately using the existing deployment instructions. No paid plan or billing upgrade was enabled by this setup; GitHub Actions and Cloudflare account allowances still apply.
