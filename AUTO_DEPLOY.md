# Automatic deployment

Workflow: .github/workflows/deploy-cloudflare.yml. Pushes to main and manual dispatch run locked dependency installation, Worker integration/unit tests and application/browser regressions before deployment. Jobs serialize production releases and use read-only repository permissions. Third-party actions are pinned to verified official action commit hashes. Deployment credentials are available only in the production deployment step.

Destination: PopForge in the shailu3597@gmail.com Cloudflare account (66d3b261587ce5aeb4849141b6cca30d). Health URL: https://popforge.shailu3597.workers.dev/api/health.

One-time prerequisites:
1. The GitHub login publishing the workflow needs workflow scope.
2. Create a dedicated Cloudflare API token with the Edit Cloudflare Workers template restricted to this Gmail account. Do not copy a Wrangler OAuth login or JWT_SECRET into CI. Existing application secrets remain in Cloudflare.
3. Add the token as the repository Actions secret CLOUDFLARE_API_TOKEN at https://github.com/Shailu016/popforge/settings/secrets/actions . Never commit the token or paste it into chat.
4. Push main or run Test and deploy to Cloudflare from the Actions tab. Verify a successful run and the live health check before calling auto-deployment active.

Schema migrations and customer-data imports are deliberately not executed automatically. Review and apply migrations separately using the existing deployment instructions. No paid plan or billing overage configuration is enabled; GitHub Actions and Cloudflare account allowances still apply.
