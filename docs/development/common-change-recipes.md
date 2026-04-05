# Common Change Recipes

These are the safest implementation paths for common Compass changes.

## Add A Backend Endpoint

1. Define or extend a shared schema/type in `packages/core/src/types` if the contract is shared.
2. Add the route to the relevant `packages/backend/src/*/*.routes.config.ts`.
3. Keep the controller thin in `controllers/*.controller.ts`.
4. Put business logic in `services/*.service.ts`.
5. Add controller or service tests.
6. If the endpoint affects realtime UI, decide whether an SSE event is required.

## Add A New Event Field

1. Update the event schema/types in `packages/core/src/types/event.types.ts`.
2. Update any mapper or utility code in `packages/core/src/mappers` or `packages/core/src/util/event`.
3. Update backend persistence or parser logic if the field is stored or transformed.
4. Update web editors, selectors, and rendering.
5. Add tests in `core`, `web`, and `backend` as needed.

Rule: never treat event shape as web-only unless the field is strictly presentational.

## Change Recurring Event Behavior

1. Read `packages/core/src/types/event.types.ts`.
2. Read `docs/features/recurring-events-handling.md`.
3. Read `packages/backend/src/event/classes/compass.event.generator.ts`.
4. Read `packages/backend/src/event/classes/compass.event.parser.ts`.
5. Read `packages/backend/src/event/classes/compass.event.executor.ts`.
6. Read `packages/backend/src/sync/services/sync/compass/compass.sync.processor.ts`.
7. Update the planner, executor, or scope-expansion path that actually owns the behavior.
8. Add focused tests for the exact recurrence transition you changed.

Do not edit recurring behavior from one layer only.

### Common Mistakes

- **Changing only the executor without updating the parser plan builders** — the executor reads the `steps` array that the parser produces. If the plan builder for a given transition key is wrong, the executor will silently do the wrong thing even if the executor logic looks correct. Always trace from `PLAN_BUILDERS` in `compass.event.parser.ts` to confirm `steps` and `googleEffect` match the intended behavior.
- **Missing a database migration for existing recurring events** — existing user data will not be retroactively updated by code changes alone. If you modify how recurring series are stored or processed, add a migration to `packages/scripts/src/migrations`.
- **Testing only the happy-path transition** — someday and cancellation transitions follow different planner paths. A test that only covers the primary create/update flow can pass while someday transitions break silently.

## Triage A Recurrence Sync Regression

1. Reproduce with one event and one expected transition outcome.
2. Capture processor logs for the transition key:
   - `Handle Compass event(<id>): <transitionKey>`
3. Find the key in `PLAN_BUILDERS` in `packages/backend/src/event/classes/compass.event.parser.ts`.
4. Confirm planned `steps` and `googleEffect` match expected behavior.
5. Confirm executor step mapping in `packages/backend/src/event/classes/compass.event.executor.ts`.
6. Run focused tests:
   - `bun run test:backend --runTestsByPath packages/backend/src/event/classes/compass.event.parser.test.ts packages/backend/src/event/classes/compass.event.executor.test.ts packages/backend/src/sync/services/sync/__tests__/compass.sync.processor.test.ts --runInBand`

## Add An SSE Event

1. Add the event name to `packages/core/src/constants/sse.constants.ts`.
2. Update shared payload types in `packages/core/src/types/sse.types.ts` if needed.
3. Emit from `packages/backend/src/servers/sse/sse.server.ts` (or call site that uses `publish`).
4. Consume it in a web hook under `packages/web/src/sse/hooks` (listeners on `EventSource`).
5. Add tests on both emitter and listener sides.

## Add Or Change Local Storage Data

1. Update `packages/web/src/common/storage/adapter/storage.adapter.ts` if the public adapter contract changes.
2. Update `packages/web/src/common/storage/adapter/indexeddb.adapter.ts`.
3. Add a migration if existing user data could become invalid.
4. Add adapter and migration tests.

### Common Mistakes

- **Adding new fields without a migration** — existing users already have data in IndexedDB without the new field. If your code expects the field to be present, it will fail silently or throw on their existing records. Always add a migration in `packages/web/src/common/storage/migrations/migrations.ts` and test the migration path, not just the new code path.
- **Testing only the new code path** — write a test that starts with pre-migration data (the old shape) and confirms the migration transforms it correctly. A test that only creates fresh data will not catch migration regressions.

## Change Repository Selection Or Offline Behavior

1. Start in `packages/web/src/common/repositories/event/event.repository.util.ts`.
2. Verify auth-state implications in `packages/web/src/auth/session/SessionProvider.tsx` and auth-state helpers.
3. Test both never-authenticated and previously-authenticated behavior.

## Change Day View Task Behavior

1. Start in `packages/web/src/views/Day/hooks/tasks`.
2. Inspect supporting UI in `packages/web/src/views/Day/components/TaskList`.
3. If persistence changed, update storage adapter code and tests.

## Change A Shared Hotkey Dialog (Day + Week)

Use this for overlays mounted in both `CalendarView` and `DayViewContent` (for example Dedication).

1. Update the shared dialog component in `packages/web/src/views/Calendar/components/Dedication/Dedication.tsx`.
2. Confirm both mount points still render it:
   - `packages/web/src/views/Calendar/Calendar.tsx`
   - `packages/web/src/views/Day/view/DayViewContent.tsx`
3. Keep keyboard behavior aligned:
   - toggle hotkey (`ctrl+shift+0`)
   - close hotkey (`escape` when open)
4. Preserve the transition lifecycle:
   - open with `showModal()` then set visible state
   - close by state first, then `dialog.close()` in `onTransitionEnd`
   - keep `onCancel(e.preventDefault())` so Escape uses the animated close path

Common pitfall: calling `dialog.close()` directly in an event handler will skip the CSS exit transition and can produce abrupt UI changes.

## Add A Migration Or Seeder

For database migrations:

1. inspect `packages/scripts/src/commands/migrate.ts`
2. add migration under `packages/scripts/src/migrations`
3. run the relevant scripts tests

For web local-data migrations:

1. inspect `packages/web/src/common/storage/migrations/migrations.ts`
2. add the migration to the correct registry
3. add migration tests

## Change Environment Handling

1. Update the relevant env schema:
   - backend: `packages/backend/src/common/constants/env.constants.ts`
   - web: `packages/web/src/common/constants/env.constants.ts`
2. Confirm startup behavior still works in the intended dev mode.
3. Document any new required variables.

## Add A New CLI Command

1. Register the command in `packages/scripts/src/cli.ts`.
2. Implement behavior in `packages/scripts/src/commands`.
3. Reuse shared CLI utilities from `packages/scripts/src/common`.
4. Add integration tests in `packages/scripts/src/__tests__`.
