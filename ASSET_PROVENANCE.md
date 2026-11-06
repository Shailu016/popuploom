# Asset provenance and external media register

Last updated: 2026-11-05

This register covers every file shipped from `assets/` by `scripts/build-cf.cjs`. It records exact source/generation evidence where it exists. It is not a legal clearance certificate for third-party services, and it does not invent licenses.

## Provenance investigation

Git history and the repository were checked before replacement:

- The 12 original template JPEGs were added in commit `ea80efd` (“Initial PopForge application with security fixes and regression tests”). The repository contained no license, purchase record, creator note, EXIF source/copyright field or generation record for them.
- The original branding PNG/SVG files were added in commit `f7eb9ee` (“Rebrand as PopupLoom with dual runtime and host migration policy”). The commit messages describe the rebrand, but no explicit license/source record for the image files was present.
- `assets/age-gate-ambient.svg` was added in commit `5feaa3b` with an explicit commit message describing it as an “authored, license-clean ambient SVG”. That SVG is retained and documented as project-authored.
- No stock-photo credits, paid-license receipts or external asset manifests were found.

Because defensible provenance for the 12 JPEGs and the uncertain branding files was absent, they were replaced on 2026-11-05 with original code-native vector artwork authored for this project. The replaced files were not edited, traced or transformed from the old images.

## Replacement artwork

**Source of truth:** `assets/source/templates/*.svg` and `assets/source/brand/*.svg`.

**Reproducible generator:** `scripts/generate-project-art.cjs` (run `node scripts/generate-project-art.cjs`). It writes the SVG source files and renders the legacy JPG/PNG paths with Sharp. The source SVGs contain `<title>`/`<desc>` metadata identifying them as original PopupLoom artwork authored 2026-11-05.

**Art direction:** simple geometric vector scenes using the existing orange PopupLoom identity, with the same subject and broad palette as the replaced template assets. No stock media, no photographs, no third-party logos and no fake product UI.

- 12 template assets: SVG source at 1100×733, rendered to the existing `.jpg` legacy paths at 1100×733, JPEG quality 90.
- Brand mark: authored two-circle orange mark on a dark rounded tile; source at `assets/source/brand/favicon.svg` and `popuploom-mark.svg`; rendered to the existing favicon/apple-touch PNG paths.
- Social card: authored at `assets/source/brand/og-popuploom.svg`, rendered to `assets/og-popuploom.png` at 1200×630 with the unchanged “PopupLoom” wordmark.
- **Retained:** `assets/age-gate-ambient.svg` (authored, license-clean per commit `5feaa3b`). It remains an SVG and was not replaced.

**Recoverable originals:** the replaced files were copied to `private-data/legacy-assets-2026-11-05/` before replacement. That directory is ignored by Git and is outside the public build; it is preserved for rollback/comparison only, not as a public asset source.

## Status summary

| Group | Files | Status | Evidence |
| --- | --- | --- | --- |
| Template illustrations | `assets/*.jpg` (12) | Original project artwork | SVG source + `scripts/generate-project-art.cjs` |
| Brand mark and icons | `favicon.svg`, `favicon-16.png`, `favicon-32.png`, `apple-touch-icon.png`, `popuploom-mark.svg` | Original project artwork | Source SVGs + generator |
| Social card | `og-popuploom.png` | Original project artwork | `assets/source/brand/og-popuploom.svg` + generator |
| Age-gate illustration | `age-gate-ambient.svg` | Retained authored/license-clean SVG | Commit `5feaa3b` |
| Product screenshots | `assets/guides/*.png` | Original captures from the local build; fake data | Capture record below; depicts the new original illustrations |
| External video | `player` template / `demo.html` YouTube embed | Verified available 2026-11-05; CC BY 3.0 | YouTube oEmbed HTTP 200; Blender Foundation license |
| Google Fonts | `fonts.googleapis.com` / `fonts.gstatic.com` | Third-party service; no font files shipped | Privacy page disclosure |

The product screenshots now depict the new original vector illustrations. They no longer depend on the replaced template photography. The screenshots still use fabricated lead data and the isolated test account described below.

## External video

The demo video is the official Blender Foundation “Big Buck Bunny” upload:

- URL: `https://www.youtube.com/watch?v=aqz-KE-bpKQ`
- oEmbed check: HTTP 200 on 2026-11-05
- Title returned by YouTube: “Big Buck Bunny 60fps 4K - Official Blender Foundation Short Film”; author: Blender
- License basis: Blender Foundation / Peach open movie, Creative Commons Attribution 3.0 — https://peach.blender.org/about/
- Attribution: “Big Buck Bunny, Blender Foundation, CC BY 3.0” in the `player` template note and the demo page note
- Suitability: non-sensitive animated short used only as a sample video embed. Do not imply it is customer footage or an endorsement.

## Full manifest

SHA-256 prefixes are for change detection. Dimensions are pixels for raster files. Source SVG entries are the authored files; JPG/PNG entries are generated derivatives.

| File | Bytes | SHA-256 (16) | Dimensions | Role |
| --- | ---: | --- | --- | --- |
| assets/age-gate-ambient.svg | 2261 | 6097547145b10710 | vector | Retained authored age-gate illustration |
| assets/apple-touch-icon.png | 5291 | 1ef4f100878f690d | 180x180 | Generated brand icon |
| assets/coffee-warm.jpg | 32681 | 94ee534045363805 | 1100x733 | Generated template illustration |
| assets/cyber-keys.jpg | 52637 | ce8317f73da3efbc | 1100x733 | Generated template illustration |
| assets/earbuds-violet.jpg | 33760 | e5b1faf7c3a1c864 | 1100x733 | Generated template illustration |
| assets/favicon-16.png | 452 | f3e245f48bfc9e72 | 16x16 | Generated brand icon |
| assets/favicon-32.png | 868 | 95ed79565e7a6afb | 32x32 | Generated brand icon |
| assets/favicon.svg | 457 | 29ddd5713efacb97 | vector | Authored brand mark |
| assets/flash-watch.jpg | 49136 | bb0d1b4e5f6fc0b3 | 1100x733 | Generated template illustration |
| assets/giftbox-bf.jpg | 34700 | e4e4501046c26de4 | 1100x733 | Generated template illustration |
| assets/guides/demo-popup.png | 152660 | c535806b070c486e | 1366x900 | Product screenshot with demo data |
| assets/guides/home-actions-mobile.png | 47216 | 6de8318297ce04be | 390x690 | Product screenshot with fake dashboard data |
| assets/guides/install-code.png | 39021 | 46de4627867efa0f | 1128x105 | Product screenshot of static install code |
| assets/guides/lead-inbox-demo.png | 118295 | a822017fcb55c031 | 1366x900 | Product screenshot with fabricated leads |
| assets/guides/studio-behavior-panel.png | 347593 | 38588a7dd9c7bcb7 | 1366x900 | Product screenshot |
| assets/guides/studio-editor-desktop.png | 370510 | 3f0d8282e700a4d8 | 1366x900 | Product screenshot |
| assets/guides/studio-editor-mobile.png | 65223 | 99b4de61bfae9311 | 390x844 | Product screenshot |
| assets/guides/template-catalog-desktop.png | 109500 | d5c94967c012a8e1 | 1366x900 | Product screenshot |
| assets/headphones-night.jpg | 42532 | 412b828a4323835b | 1100x733 | Generated template illustration |
| assets/linen-shirt.jpg | 25469 | 27c079732756959a | 1100x733 | Generated template illustration |
| assets/og-popuploom.png | 121856 | 31ea46ebbd433fa4 | 1200x630 | Generated social card |
| assets/popuploom-mark.svg | 460 | 0ad6afca4085c1d4 | vector | Authored brand mark |
| assets/prize-bundle.jpg | 41284 | 6d3a51d78698cd23 | 1100x733 | Generated template illustration |
| assets/skincare-ritual.jpg | 28973 | 63c6a4b144fd84a4 | 1100x733 | Generated template illustration |
| assets/sneaker-flash.jpg | 41122 | 30ff28268b37c32d | 1100x733 | Generated template illustration |
| assets/source/brand/favicon.svg | 457 | 29ddd5713efacb97 | vector | Brand mark source |
| assets/source/brand/og-popuploom.svg | 2012 | 65f9f025a51cbe65 | vector | Social-card source |
| assets/source/brand/popuploom-mark.svg | 460 | 0ad6afca4085c1d4 | vector | Brand mark source |
| assets/source/README.md | 904 | f7335996f53b62aa | text | Source/regeneration note |
| assets/source/templates/coffee-warm.svg | 2569 | 95df1c31c97b8474 | 1100x733 | Template illustration source |
| assets/source/templates/cyber-keys.svg | 7732 | 007b0a7959a12890 | 1100x733 | Template illustration source |
| assets/source/templates/earbuds-violet.svg | 2444 | c936dc7fded076d2 | 1100x733 | Template illustration source |
| assets/source/templates/flash-watch.svg | 2705 | 6d5e7d6fa29fb0f4 | 1100x733 | Template illustration source |
| assets/source/templates/giftbox-bf.svg | 2321 | ba3afe32bf9e0001 | 1100x733 | Template illustration source |
| assets/source/templates/headphones-night.svg | 2426 | d2e5c4227611bf2b | 1100x733 | Template illustration source |
| assets/source/templates/linen-shirt.svg | 2467 | 52f29a604097e966 | 1100x733 | Template illustration source |
| assets/source/templates/prize-bundle.svg | 2424 | 9430f167657e603b | 1100x733 | Template illustration source |
| assets/source/templates/skincare-ritual.svg | 2526 | dc116fddceae6d13 | 1100x733 | Template illustration source |
| assets/source/templates/sneaker-flash.svg | 2794 | eb9b88d1c6c32bdd | 1100x733 | Template illustration source |
| assets/source/templates/sticky-mug.svg | 2937 | 22c4d3383c5aadc1 | 1100x733 | Template illustration source |
| assets/source/templates/winter-gift.svg | 2187 | d662ad6c3f48f5a7 | 1100x733 | Template illustration source |
| assets/sticky-mug.jpg | 29699 | e86778443d2ae8f1 | 1100x733 | Generated template illustration |
| assets/winter-gift.jpg | 24756 | ebfc64f0ead95996 | 1100x733 | Generated template illustration |

## Screenshot capture record

Captured 2026-11-05 from the local Express build with an isolated temporary database, after the artwork replacement:

- Studio editor: `studio.html?tpl=drop48`, desktop and 390px mobile.
- Behavior panel: `studio.html?tpl=drop48`, Behavior tab.
- Install code: homepage docs block with JavaScript disabled so the static production URL is visible.
- Template catalog: `/templates.html`.
- Lead inbox: `leads.html?id=…` with three fabricated rows (`maya@example.com`, `derek@example.com`, `priya@example.com`, each labelled “Sample row — not a real customer”).
- Demo popup: `/demo.html`.
- Mobile dashboard: homepage at 390px after action wrapping and local table scroll fixes.

No real account, lead, reset token or customer data was used. The account email visible in the studio screenshot is the isolated test account `adsense-demo@example.com`. The screenshots depict original PopupLoom vector artwork, not the replaced stock-like photos.

## Outstanding inputs

The template media and branding-rights gap is resolved by replacement with original project artwork, subject to the owner's visual acceptance of the new art direction.

Still outstanding for advertising:

1. Independently verify the externally supplied publisher ID/meta and AdSense account ownership/eligibility; obtain the AdSense client ID, verification values and ad unit IDs.
2. A Google-certified CMP, consent/choice configuration and regional settings.
3. Phase B strict-CSP/CMP integration and review.
4. Owner decision on the retained Big Buck Bunny demo video and attribution.
5. Legal review of Terms/privacy for the operator's actual jurisdiction.
