# Authored source artwork

These SVGs are original PopupLoom artwork authored for this project on 2026-11-05. They are the source of truth for the template JPEGs and branding PNGs shipped from `assets/`.

- `templates/*.svg` — 12 template illustrations, 1100×733; rasterized to the existing `assets/*.jpg` legacy paths.
- `brand/favicon.svg` — brand mark source; rasterized to `favicon-16.png`, `favicon-32.png` and `apple-touch-icon.png`.
- `brand/popuploom-mark.svg` — larger mark source.
- `brand/og-popuploom.svg` — social card source; rasterized to `og-popuploom.png` at 1200×630.

Regenerate all derived files with:

```sh
node scripts/generate-project-art.cjs
```

No stock photography, third-party imagery or tracing of the replaced files was used. The retained `assets/age-gate-ambient.svg` is separately documented in `ASSET_PROVENANCE.md` (commit `5feaa3b`, authored/license-clean).
