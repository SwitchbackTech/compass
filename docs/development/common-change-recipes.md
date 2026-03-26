# Common Change Recipes

These are the safest implementation paths for common Compass changes.

## Add A Backend Endpoint

1. Define or extend a shared schema/type in `packages/core/src/types` if the contract is shared.
2. Add the route to the relevant `packages/backend/src/*/*.routes.config.ts`.
3. Keep the controller thin in `controllers/*.controller.ts`.
4. Put business logic in `services/*.service.ts`.
5. Add controller or service tests.
6. If the endpoint affects realtime UI, decide whether a websocket event is required.

## Add A New Event Field

1. Update the event schema/types in `packages/core/src/types/event.types.ts`.
2. Update any mapper or utility code in `packages/core/src/mappers` or `packages/core/src/util/event`.
3. Update backend persistence or parser logic if the field is stored or transformed.
4. Update web editors, selectors, and rendering.
5. Add tests in `core`, `web`, and `backend` as needed.

Rule: never treat event shape as web-only unless the field is strictly presentational.

## Change Recurring Event Behavior

1. Read `packages/core/src/types/event.types.ts`.
2. Read `docs/recurrence-handling.md`.
3. Read `packages/backend/src/event/classes/compass.event.generator.ts`.
4. Read `packages/backend/src/event/classes/compass.event.parser.ts`.
5. Read `packages/backend/src/event/classes/compass.event.executor.ts`.
6. Read `packages/backend/src/sync/services/sync/compass/compass.sync.processor.ts`.
7. Update the planner, executor, or scope-expansion path that actually owns the behavior.
8. Add focused tests for the exact recurrence transition you changed.

Do not edit recurring behavior from one layer only.

## Triage A Recurrence Sync Regression

1. Reproduce with one event and one expected transition outcome.
2. Capture processor logs for the transition key:
   - `Handle Compass event(<id>): <transitionKey>`
3. Find the key in `PLAN_BUILDERS` in `packages/backend/src/event/classes/compass.event.parser.ts`.
4. Confirm planned `steps` and `googleEffect` match expected behavior.
5. Confirm executor step mapping in `packages/backend/src/event/classes/compass.event.executor.ts`.
6. Run focused tests:
   - `yarn test:backend --runTestsByPath packages/backend/src/event/classes/compass.event.parser.test.ts packages/backend/src/event/classes/compass.event.executor.test.ts packages/backend/src/sync/services/sync/__tests__/compass.sync.processor.test.ts --runInBand`

## Add A Websocket Event

1. Add the event name to `packages/core/src/constants/websocket.constants.ts`.
2. Update shared websocket types in `packages/core/src/types/websocket.types.ts` if needed.
3. Emit from `packages/backend/src/servers/websocket/websocket.server.ts`.
4. Consume it in a web socket hook under `packages/web/src/socket/hooks`.
5. Add tests on both emitter and listener sides.

## Add Or Change Local Storage Data

1. Update `packages/web/src/common/storage/adapter/storage.adapter.ts` if the public adapter contract changes.
2. Update `packages/web/src/common/storage/adapter/indexeddb.adapter.ts`.
3. Add a migration if existing user data could become invalid.
4. Add adapter and migration tests.

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
