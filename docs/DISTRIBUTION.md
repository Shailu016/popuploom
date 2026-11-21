# Distribution assets

Everything here is zero-cost. Nothing is submitted automatically; the rows marked
**owner** need an account action that cannot be performed from the repository.

## WordPress plugin

Location: `wordpress-plugin/popuploom/`

| File | Purpose |
|---|---|
| `popuploom.php` | Settings page, ID validation, footer output, plugin action link |
| `readme.txt` | WordPress.org readme format, FAQ, changelog |
| `uninstall.php` | Deletes the single option; no other data is stored |

Build the upload ZIP:

```powershell
Compress-Archive -Path wordpress-plugin\popuploom -DestinationPath wordpress-plugin\popuploom-1.0.1.zip -Force
```

Status: **in review, round 1 answered.** Submitted 2026-11-12 as 1.0.1, slug `popuploom`.
On 2026-11-17 the reviewers pended it for two small issues: drop "Free" from the display name and list
the owner in Contributors. Version 1.0.2 fixes both. It was uploaded on 2026-11-21 and the reply was sent on
the review email thread the same day. The plugin is not public until approved. Do not resubmit; reply on
the existing thread and do not ask for a status update for about a month.

Plugin Check evidence: run against a local WordPress 7.1 + SQLite install with the
official Plugin Check plugin. Final result: **no errors found**. Two findings were
fixed before submission:

- raw `<script src>` output → `wp_enqueue_script()` on `wp_enqueue_scripts`;
- readme `Tested up to` updated to 7.1.

The initial slug was `popuploom-free-popup-builder-embeds`; that produced a
text-domain mismatch in the automated scan. The slug was changed to `popuploom`
(free), matching the text domain, and version 1.0.1 was uploaded for review.

Lint before shipping:

```powershell
php -l wordpress-plugin\popuploom\popuploom.php
php -l wordpress-plugin\popuploom\uninstall.php
```

Submission (owner): <https://wordpress.org/plugins/developers/add/>. Review is not
5 days; plan for weeks and expect revision requests. A plugin that only wraps a
hosted service is acceptable only if the readme is honest about the dependency,
the account requirement and the data flow. Do not add tracking, upsells or
undisclosed remote calls to speed up review.

Checklist before submitting:

- [ ] Plugin header, GPL license and `Requires PHP` are correct.
- [ ] No `wp_remote_*` calls, no phone-home, no hidden option writes.
- [ ] Widget ID is validated on save and escaped on output.
- [ ] Readme discloses that a free PopupLoom account is required.
- [ ] Readme privacy section links `/privacy.html`.
- [ ] ZIP contains one top-level `popuploom/` folder.
- [ ] Tested on a clean WordPress install with a default theme.
- [ ] Uninstall removes the option.

## Embed helper package

Location in this repository: `integrations/popuploom-embed/`  
Public repository: <https://github.com/Shailu016/popuploom-embed> (MIT)

Dependency-free ESM helper plus React, Vue and Astro wrappers. Tests:
`npm test --prefix integrations/popuploom-embed` (4 tests).

The public repository was created on 2026-11-12. The copy inside this private
repository is the source of truth for review; keep the two in sync when the
helper changes:

```powershell
$tmp = Join-Path $env:TEMP "opencode\popuploom-embed"
Copy-Item -Recurse -Force integrations\popuploom-embed\* $tmp
Push-Location $tmp
git add .
git commit -m "Sync embed helpers"
git push
Pop-Location
```

The package is **not** published to npm. Running `npm publish` would create a
public package under the `popuploom-embed` name; do that only after deciding who
owns the npm name and adding a release process.

## Optional brand credit

Studio: **Design → “Popup by PopupLoom” credit** (off by default).

- Runtime key: `credit: true` in the saved config.
- Renders one small link under the popup content, with
  `utm_source=popuploom-widget&utm_medium=badge&utm_campaign=embed`.
- No forced branding, no paid removal, no effect on targeting.
- It is a **referral channel, not an SEO backlink**: the link is injected by
  JavaScript and search engines generally do not count it as a link.

Measurement: Cloudflare's free analytics shows referral hosts, not campaign
parameters. To measure badge clicks you need either a first-party redirect
endpoint with a counter or an analytics tool that reads UTM parameters. That is a
deliberate later decision, not part of this change.
