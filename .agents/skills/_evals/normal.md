# Eval stub: normal

**Skill:** `/verify-change` (also `/ship` Validate gate)

**Input:** a branch whose merge-base vs `origin/main` plus working tree
touches only `packages/scripts/**` (no `packages/web/**`, no `e2e/**`).

**Run:** `bun run verify`

**Expected output:**

- selected package includes `scripts`
- does not invent `core` or `web` as a fallback
- runs `bun run test:scripts`, then `type-check`, `lint`, `knip`
- does not select `test:e2e` / `test:a11y` for this diff
- verifier verdict `PASS` only if those executed checks passed

**Ship routing:** scripts-only change → Implementer then Verifier; not a
`packages/core` contract fan-out.
