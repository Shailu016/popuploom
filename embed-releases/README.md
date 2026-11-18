# Frozen embed releases

Each folder holds the exact runtime bytes published at `/embed/<version>/`.
A published version is immutable: customers may pin it with SRI or verify it
against `SHA256SUMS`, and browsers cache it for a year. Never edit these files.
A new runtime ships as a new version directory built from `popuploom.js`
(see `scripts/build-cf.cjs`).

- `1.1.0/popuploom.js` - byte-identical to the live release on 2026-11-18
  (sha256 d452116065ed9181726309d96306665ae1d6c95dce9bffe5ea22922ab6e50ac5).
