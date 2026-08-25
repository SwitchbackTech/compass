# WP-08 — Architecture as training data (gated)

**task_id:** WP-08
**status:** queued
**owner:** human decides run vs cancel; then Implementer
**depends on:** WP-01 through WP-05 `done`, plus scale-gate review
**next owner after done:** delete `wip/restructure/` if WP-07 is also `done`
and five evidenced passes exist

## Gate (read before any code)

Run this WP only if **discovery is still the bottleneck** after:

- `bun run verify` matches CI (WP-01)
- typed handoffs exist (WP-02)
- Manager / reviewer / verifier skills exist (WP-03)
- recurring comments are CI (WP-04)
- skills are indexed and versioned (WP-05)

If agents still fail by editing the wrong package, missing the other half
of an SSE pair, or spending the session in `docs/development/feature-file-map.md`,
this WP is justified.

If agents fail by skipping evidence, merging without review, or fighting
CI, **cancel this WP**. That is not an architecture problem. Set
`TRACKING.md` status to `escalated` or `done` with artifact “cancelled:
gate not met” and delete the pack per README deletion rules.

Playbook: do not copy local bans; copy the method. Co-locate so the
correct path is easy. Do **not** slice the monorepo into
`features/event/{web,backend,core}` unless a later session proves
cross-package discovery is still the tax after in-package co-location.

## Finish line (if the gate passes)

1. A written bottleneck note in this file’s Evidence: which searches
   failed in real agent runs (link PRs or handoffs).
2. **In-package** co-location for at most **one** hotspot, chosen from
   evidence, not taste. Likely candidates (confirm against the file map):

   | Hotspot | Why agents get lost |
   | --- | --- |
   | Week/Day shortcuts vs `packages/web/src/shortcuts` | owners vs registry split |
   | SSE emit (backend) vs consume (web) vs contracts (core) | three packages; do **not** merge packages; add a recipe + “pair test” reminder that CI can grep |
   | Event schema (`core`) vs mappers vs API | already documented; maybe a checker from WP-04 is enough |

3. Import-boundary tests that fail when recurrence logic appears under
   `packages/backend` or `packages/web` (sync owns recurrence).
4. Feature-file-map updated for the one hotspot so the first files to
   open are a short list at the top of that section.
5. No cross-package folder rewrite. No “ban comments.” No new framework.

If the chosen hotspot cannot be improved without a cross-package move,
**stop and escalate** with a recovery-style packet: decision required,
recommended option, alternatives, cost of waiting.

## Steps (only after gate)

1. Quote the scale-gate metrics and the discovery failures in Evidence.
2. Pick one hotspot. Write the target file list before moving files.
3. Move files **within** a package if that shortens search. Update
   imports with existing aliases (`@web/*`, `@compass/core`, …).
4. Add a scripts test or WP-04 checker rule for the invariant you are
   protecting (e.g. no recurrence implementation outside `packages/sync`).
5. Run focused package tests + `bun run verify`.
6. Update `docs/development/feature-file-map.md` and the relevant recipe.
7. If the move is large, `/simplify` separately.

## Acceptance tests

- **Gate:** Evidence contains a go/no-go with metrics; no-go still
  counts as completing the WP (cancel).
- **Normal (go):** an agent asked “where is X?” gets the file map section
  in ≤ the files you listed; a forbidden-package placement fails CI.
- **Incomplete:** attempting a cross-package feature-slice in this WP is
  out of scope — reject the change.
- **Policy:** no production behavior change required. If behavior changes,
  you picked the wrong refactor.
- **Rollback:** git revert of the move is documented as the rollback path.

## Evidence

```text
gate: run | cancel
reason (discovery bottleneck? which PRs?):
hotspot:
files moved:
checker/rule added:
verify result:
```

## Out of scope

- Merging `packages/web` + `backend` + `core` by feature
- Banning React patterns, comments, or Tailwind arbitrary values beyond
  existing semantic-color rules
- Performance work disguised as co-location
- Using this WP to “clean up” unrelated folders

## Safe fan-out (if you parallelize the move)

Do not. One hotspot, one owner. Parallel file moves on the same package
create merge pain for no independent evidence.

## Handoff

```yaml
task_id: WP-08
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
You are implementing WP-08 from wip/restructure/WP-08-architecture-as-training.md.
Read README.md, TRACKING.md, and the scale gate. WP-01 through WP-05 must
be done.

First decide run vs cancel. If discovery is not the bottleneck, cancel
the WP in TRACKING.md with evidence and stop. Do not move code.

If you run: pick one in-package hotspot from real agent failures, move
the minimum files, add a mechanical invariant (e.g. recurrence stays in
sync), update the feature file map, run bun run verify. No monorepo
feature-slice. Commit. Update TRACKING.md and Evidence.
```
