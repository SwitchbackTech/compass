# Full Sweep Cleanup Design

## Goal

Clean up the Compass codebase in one branch with a full overnight sweep that prioritizes reliability first, maintainability second, and web editing clarity third.

## User Direction

- Optimize for all three improvement goals in this order: backend sync reliability, repo maintainability, web editing clarity.
- Use one branch for the whole effort.
- Aim for a full sweep in one night rather than a conservative partial cleanup.
- Keep the final report plain-English and understandable to a smart reader who is not reading the code.

## Approved Approach

Use a full-sweep program with hard internal boundaries. The branch is one delivery unit, but the work is ordered as three linked phases:

1. Sync and live-update backend cleanup.
2. Test and tooling cleanup that supports safer backend changes.
3. Web-side cleanup in the calendar editing flow.

This approach keeps the ambition high while giving the work a clear center of gravity. The first phase is the most important. The second phase makes the first phase trustworthy. The third phase reduces future friction in the calendar editing surface.

## Phase 1: Sync And Live-Update Backend

The backend sync area currently concentrates many responsibilities in `packages/backend/src/sync/services/sync.service.ts`: imports, incremental sync, watch setup and teardown, repair, maintenance, live-update notification, and Compass-to-Google backfill. The cleanup should split these responsibilities into focused files while preserving the public `syncService` API used by controllers, user services, tests, and import services.

The preferred boundary is:

- `sync.notification.service.ts`: incoming Google notifications and stale-watch cleanup.
- `sync.import-runner.ts`: full import, incremental import, restart/repair orchestration, and start-sync orchestration.
- `sync.watch.service.ts`: start, stop, refresh, and delete watch records.
- `sync.maintenance-runner.ts`: scheduled maintenance across users and per-user maintenance.
- `sync.compass-to-google.ts`: Compass-originated event backfill into Google after repair.
- `sync.service.ts`: compatibility facade that exposes the existing service methods by delegating to the focused modules.

Behavior should remain compatible unless the cleanup exposes an obvious reliability issue. Allowed reliability fixes include duplicate-work guards, stale watch cleanup, stuck status cleanup, safer failure state reporting, and clearer error paths.

## Phase 2: Tests And Tooling

This phase should not become a generic repository cleanup. It should strengthen confidence around the work touched in phase 1 and any shared contracts those flows rely on.

The implementation should:

- Add focused tests for extracted sync modules.
- Keep existing integration-style backend tests passing.
- Add tests around failure and duplicate-work paths when behavior is adjusted.
- Add a small verification command or script only if it makes repeatable overnight validation easier.
- Run the repo's existing validation commands before handoff.

## Phase 3: Web Editing Cleanup

The web-side cleanup should target the calendar draft/editing flow without replacing the repo's intentional state architecture. Redux, sagas, Elf, and local storage should stay in their existing roles.

The preferred target is `packages/web/src/views/Calendar/components/Draft/hooks/actions/useDraftActions.ts`. The cleanup should separate dense decision logic from interaction wiring so dragging, resizing, submitting, discarding, and form-opening are easier to understand. The hook can remain the public entrypoint, but helper files should own pure decisions and payload-building where practical.

Likely focused units:

- A submit-action helper for create/update/discard/open-form decisions.
- A movement helper for drag and resize date calculations.
- A recurrence/draft helper only if it removes real duplication.

## Non-Goals

- Do not redesign the overall sync model.
- Do not rewrite frontend state management.
- Do not introduce new dependencies unless an existing repo dependency cannot reasonably solve the problem.
- Do not do broad formatting or unrelated cleanup.
- Do not change user-visible behavior unless it is part of an obvious reliability fix.

## Finishing Criteria

The branch is ready when:

- Sync service responsibilities are split into focused modules while existing callers keep working.
- Backend sync tests cover the changed modules and the known reliability edges touched by the cleanup.
- Calendar draft/editing logic is easier to follow without changing the public component contract.
- `bun run test:backend`, `bun run test:web`, `bun run test:core`, `bun run type-check`, and `bun run lint` have been run or any inability to run them is clearly recorded.
- The final report explains what changed, what was verified, and what risk remains in plain English.

## Risks

- The sync area touches Google imports, watches, user metadata, SSE, and event persistence, so broad behavior changes could cascade.
- Existing tests rely on spies against `syncService`; the compatibility facade should preserve spyable method names.
- The import code currently imports `syncService`, so extracting modules must avoid creating circular dependency problems.
- Web draft cleanup can accidentally change interaction timing; tests should focus on decisions and payloads rather than implementation details.

## Self-Review Notes

- The spec covers the requested priority order: reliability, maintainability, editing clarity.
- The spec keeps the whole effort in one branch while ordering the work internally.
- The spec gives permission for reliability fixes without allowing an open-ended redesign.
- The spec explicitly excludes broad rewrites and unrelated cleanup.
