# WP-04 — Hard constraints (environment as training data)

**task_id:** WP-04
**status:** queued
**owner:** Implementer (scripts/CI) then Verifier
**depends on:** WP-01 `done` (verify is the local gate these checks should
join where cheap)
**next owner after done:** none until WP-05; unblocks scale of constraints

## Why

Playbook (Cursor/Dune method): convert recurring review comments into lint,
CI, or structure. Prompts guide; environments prevent classes of failure.
Do **not** copy Grok Bot’s local bans. Copy the method.

Recurring Compass comments that are already machine-checkable:

| Comment | Today | Make hard |
| --- | --- | --- |
| No barrel `index.ts` / `index.tsx` | `AGENTS.md` prose | CI grep with allowlist |
| RTL: no CSS / `data-*` locators in web tests | playbook + `.cursor/rules/web-testing.mdc` | lint or grep in `packages/web/**/*.test.*` |
| Do not re-enable web `--parallel` | `test-parallel.ts` comment | assert `profile === "web"` has no `--parallel` |
| Shared event schemas only from `@compass/core` | convention | import-boundary test or knip/custom script |
| No direct `mongoService` in package tests | playbook | grep in `packages/backend` and `packages/sync` tests |
| PR template filled with executed evidence | template comments | CI job fails empty required sections |
| Semantic Tailwind colors | `check-semantic-colors.ts` | keep; extend if the implementing session finds obvious holes |
| Biome a11y still `warn` | `biome.json` | promote only rules with zero (or trivially fixable) existing hits |

## Finish line

1. A new check script (or small family) runs in CI next to lint — either
   `bun run lint` grows a step or `test-unit.yml` gains a `constraints`
   job. Local `bun run verify` (WP-01) should run the same script so
   agents see failures before push.
2. **Barrels:** fail on new `index.ts`/`index.tsx` under `packages/**`
   that re-export other modules, except an explicit allowlist of paths
   that already exist. Do not treat `packages/web/src/index.tsx` (app
   entry) as a barrel. Confirm allowlist against the tree at
   implementation time (known existing component barrels include
   `GoogleAuthCallback`, `NotFound`, `AbsoluteOverflowLoader`, `Tooltip`,
   `SaveSection`; `routers/index.tsx` is router config — classify,
   don’t guess).
3. **Web test locators:** fail `packages/web/**/*.{test,spec}.{ts,tsx}`
   that use `getByTestId`, `querySelector`, or CSS-class queries in RTL
   calls. Allow `data-*` in production components. Tune to avoid hitting
   MSW/test harness internals; put harness paths on an allowlist if
   needed.
4. **Web `--parallel`:** a unit test or script reads
   [`test-parallel.ts`](../../packages/scripts/src/testing/test-parallel.ts)
   (or better: assert at runtime that the web profile’s argv lacks
   `--parallel`). Prefer a test that imports or inspects the built argv
   over a brittle source grep.
5. **`mongoService` in tests:** fail imports of `mongoService` from
   `packages/backend/**/*.test.*` and `packages/sync/**/*.test.*`.
   **Allow** `packages/scripts/**/*.db.test.ts` unless you migrate those
   call sites in this WP (do not expand scope into a driver rewrite).
6. **Import boundary:** fail `packages/web` and `packages/backend` files
   that define a duplicate Zod event schema when
   `packages/core/src/types/event.contracts.ts` already exports it.
   Start narrow (grep for `EventSchema` / `z.object` copies of event
   fields) rather than a full dependency-cruiser rollout.
7. **PR template completeness:** on pull_request, a job fails if the PR
   body has empty `## Automated validation`, `## Independent review`, or
   `## Test plan` sections (placeholder HTML comments only, or fewer than
   N non-comment characters). Docs-only PRs that skip tests via
   `paths-ignore` should still fill Independent review or the job should
   skip when the PR is markdown-only — pick one, document it. Never
   accept unchecked markdown task boxes as evidence (template already
   forbids them; keep it that way).
8. **A11y warn → error:** run biome on current `warn` a11y rules; promote
   to `error` only those with a clean or one-PR-fixable hit list. Leave
   the rest as warn and list them in Evidence. Do not “fix the world”
   inside this WP.

## Steps

1. Inventory current barrels, `getByTestId` / `querySelector` in web
   tests, and `mongoService` test imports. Write allowlists from reality,
   not from this file’s snapshot.
2. Put the checker in `packages/scripts/src/testing/` (alongside
   `check-semantic-colors.ts`). Name it something like
   `check-agent-constraints.ts`. Keep one entry script so CI/verify have
   one command.
3. Wire into `package.json` (`lint` or a new `constraints` script that
   `verify.ts` already runs, or add to verify in this WP if WP-01 did not
   leave a hook). Prefer adding to `bun run lint` only if the script is
   fast (<15s); otherwise a separate verify/CI step.
4. Add `packages/scripts` tests for the checker with fixture strings
   (barrel file, locator line, mongoService import).
5. Add or extend `.github/workflows/test-unit.yml` for PR body
   completeness. Use `github.event.pull_request.body`. Fail closed if the
   body cannot be read.
6. Run the checker against `main`; fix accidental hits that are true
   positives and cheap; allowlist the rest with a comment pointing at a
   follow-up, not a silent skip.

## Acceptance tests

- **Normal:** a new `packages/web/src/foo/index.ts` that only re-exports
  fails the checker; app entry `packages/web/src/index.tsx` does not.
- **Incomplete:** PR body with empty `## Test plan` fails the PR job.
- **Tool failure:** checker spawn crash → CI job red (fail closed).
- **Policy:** a web test using `getByTestId("x")` fails; a component using
  `data-state` for styling does not.
- **Web parallel:** changing `test-parallel.ts` to add `--parallel` for
  profile `web` fails the guard test.
- **mongoService:** a new backend `*.test.ts` importing mongoService fails;
  existing scripts db tests remain green.

## Evidence

```text
checker path:
CI wiring:
allowlist paths:
biome a11y promotions:
PR-body job:
bun run <checker> on main: pass/fail excerpt:
```

## Out of scope

- Deleting all existing barrels in the same WP
- Enabling web `--parallel`
- Full dependency-cruiser / import graphs
- Perf-budget as required check
- Making independent review a GitHub required *approving* review count
  (still 0; Copilot may remain). Template completeness is the mechanical
  stand-in.

## When to harden a further rule later

- Same review comment appears repeatedly
- Machine-checkable without taste
- Violations cause rework or production risk
- The check explains how to repair

## Handoff

```yaml
task_id: WP-04
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
You are implementing WP-04 from wip/restructure/WP-04-hard-constraints.md.
Read README.md and TRACKING.md. WP-01 should be done. Mark WP-04 running.

Finish line: a scripts checker + CI for barrels (allowlisted), web-test
locator bans, web --parallel guard, mongoService import ban in
backend/sync tests, a narrow core-schema import boundary, PR template
completeness, and only those biome a11y warns that are clean enough to
promote. Inventory the tree; do not trust this file’s barrel snapshot.
Commit. Update TRACKING.md and Evidence. Do not delete every existing
barrel unless the allowlist is smaller than fixing them.
```
