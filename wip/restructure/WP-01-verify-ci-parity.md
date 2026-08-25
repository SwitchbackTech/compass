# WP-01 — Verify / CI parity

**task_id:** WP-01
**status:** queued
**owner:** Implementer (scripts) then Verifier
**depends on:** none
**next owner after done:** WP-04 can start; WP-02 may run in parallel

## Why

`bun run verify` is the local loop agents actually run. Required GitHub
checks are `lint`, `knip`, `type-check` (the full `package.json` script),
unit jobs per changed package, and `e2e`. Today
[`packages/scripts/src/testing/verify.ts`](../../packages/scripts/src/testing/verify.ts):

- diffs only `HEAD` (misses committed-unpushed work vs `main`)
- type-checks with `bunx tsc --noEmit` instead of `bun run type-check`
  (skips `packages/web/tsconfig.app.json` and `tsconfig.test.json`)
- never runs `knip`
- never runs `test:e2e` (only `test:a11y` when the `web` package is selected)
- falls back to `core` + `web` when no package is detected, which hides
  backend/sync/scripts work
- ignores `e2e/`, `.github/`, and root files when mapping packages

A green helper that CI will fail is a false completion. This WP makes the
correct path the easy path.

## Finish line

On a branch that differs from `origin/main` in more than one package,
`bun run verify` with no args:

1. Prints the merge-base, the files used for detection, and the exact check
   list.
2. Runs `bun run test:<pkg>` for each detected package, then
   `bun run type-check`, `bun run lint`, and `bun run knip`.
3. Runs `bun run test:a11y` and `bun run test:e2e` when `packages/web/**` or
   `e2e/**` changed, unless Playwright Chromium is missing — in that case
   prints a skip with the install command and does **not** claim CI parity.
4. Exits non-zero if any executed check fails.
5. Does **not** fall back to `core`+`web` when detection is empty; it prints
   “no packages detected” and still runs `type-check`, `lint`, and `knip`
   (those are required on non-docs PRs regardless).

## Steps

1. Read `packages/scripts/src/testing/verify.ts` and the root
   `package.json` scripts `verify`, `type-check`, `knip`, `lint`,
   `test:e2e`, `test:a11y`.
2. Change package detection to:
   - `git merge-base HEAD origin/main` (fetch `origin/main` if missing;
     fall back to `main` then `master`).
   - Union of `git diff --name-only <merge-base>...HEAD`, staged, and
     unstaged paths.
   - Map `packages/<name>/` → package; map `e2e/` → web + e2e checks; do
     not invent packages for docs-only diffs.
3. Replace `runTypeCheck` with `bun run type-check`.
4. Add `runKnip` (`bun run knip`).
5. Add `runE2e` gated on web or `e2e/` changes. Detect missing Chromium
   (`bunx playwright install --dry-run` or a failed first spawn that names
   the browser) and skip with a loud message rather than a silent pass.
6. Keep existing a11y color-env workaround when spawning Playwright.
7. Print a final summary: selected packages, checks run, checks skipped +
   why. Never print “All checks passed” if e2e/a11y were skipped for missing
   browsers — print “selected checks passed; CI parity incomplete: …”.
8. Add focused tests under `packages/scripts` that stub git/Bun spawn and
   assert: merge-base file lists map to the right packages; empty detection
   does not inject `core`/`web`; type-check command is `bun run type-check`;
   knip is invoked; e2e is selected for an `e2e/`-only diff.
9. Update `/verify-change` and `docs/development/testing-playbook.md` so
   they describe the helper as “required-check subset, read the skip list”
   rather than “do not trust blindly because it under-runs CI.”
10. Run `bun run test:scripts` and `bun run type-check`.

## Acceptance tests

- **Normal:** a scripts-only working tree vs `main` runs
  `test:scripts`, `type-check`, `lint`, `knip` — not web/core fallback.
- **Incomplete input:** no changed packages → no invented `core`/`web`;
  still runs type-check/lint/knip; stdout names the empty detection.
- **Tool failure:** type-check spawn non-zero → process exits 1 and
  `Failed:` lists `type-check`.
- **Policy:** docs-only diff (`*.md`, `docs/**`) may skip package tests;
  still must not claim e2e passed.
- **Web/e2e:** a file under `e2e/` selects a11y + e2e (or an explicit skip
  if Chromium is absent).

## Evidence

Record in this section when implementing:

```text
merge-base used:
commands:
stdout excerpt (selection + summary):
test:scripts result:
CI parity claim (complete | incomplete + reason):
```

## Out of scope

- Making perf-budget a required check
- Husky / pre-push hooks
- Changing GitHub required rulesets
- Running the full `bun run test` matrix on every call
- Installing Playwright browsers in every environment without asking

## Risks

- Full `test:e2e` on every web change is slow. Keep it. Speed is not a
  reason to return a false green. A later WP may add `--fast` that omits
  e2e; default stays parity.
- `origin/main` may be absent in a shallow clone. Fetch or fall back
  explicitly; do not swallow the error and use `HEAD`.

## Handoff

Fill when stopping mid-WP (until WP-02 schema lands, use this block):

```yaml
task_id: WP-01
from:
to: Implementer
status:
artifact:
evidence:
assumptions:
open_risks:
next_deadline:
```

## Session prompt

```text
You are implementing WP-01 from wip/restructure/WP-01-verify-ci-parity.md
in the Compass repo. Read wip/restructure/README.md and TRACKING.md first.
Mark WP-01 running. Do not start other WPs.

Finish line: bun run verify matches required CI (merge-base vs origin/main,
bun run type-check, knip, package tests, e2e/a11y when web or e2e changed,
no core+web fallback). Add scripts tests. Update verify-change skill and
testing-playbook. Commit with a conventional message. Update TRACKING.md
and this WP's Evidence section. Do not edit the playbook plan file.
```
