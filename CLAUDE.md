# LocalLoop Shared — Agent Guide

## Git workflow

Always branch before coding. Never commit without explicit user approval.
Full rules: see `## Git workflow` in the root `CLAUDE.md`.

```
□ On a feature branch? → git checkout -b <type>/<slug>
□ User approved changes? → show diff and wait before committing
```

---

## What this repo is

Shared TypeScript packages and project documentation for LocalLoop.

| Package | Purpose |
|---------|---------|
| `@localloop/shared-types` | Enums shared across API and mobile (Provider, DmPermission, AnchorType, etc.) |
| `@localloop/geo-utils` | Geohash helpers — coordinate conversion, 8-neighbor cells, proximity labels |

---

## Documentation map

All project documentation lives in `docs/`:

| Need | Where |
|------|-------|
| Business rules and requirements | docs/prd.md |
| Architecture decisions | docs/architecture.md |
| Database schema | docs/data-model.md |
| API contracts | docs/api-contracts.md |
| Current project state | docs/status.md |
| Why each decision was made | docs/decisions/ |

---

## Rules for this repo

- Types that cross any app boundary live ONLY in `packages/shared-types`. Never duplicate them.
- Geo-utils functions (coordinate → geohash, neighbor cells, proximity labels) live ONLY in `packages/geo-utils`.
- Bump the package version in `package.json` before merging changes — the publish workflow skips unchanged versions.
- Never add app-specific logic (NestJS decorators, React Native imports) to these packages.

---

## Publishing

Packages are published automatically to npm on every push to `main` (if version changed).
Requires `NPM_TOKEN` secret set in GitHub repo settings.

Manual publish (if needed):
```bash
npm run build
cd packages/shared-types && npm publish
cd packages/geo-utils && npm publish
```
