# Feature File Map

Use this document to find the first files to inspect for common Compass changes.

## App Boot And Routing

- Frontend bootstrap: `packages/web/src/index.tsx`
- App provider tree: `packages/web/src/components/App/App.tsx`
- Root authenticated shell: `packages/web/src/views/Root.tsx`
- Router config: `packages/web/src/routers/index.tsx`
- Router loaders: `packages/web/src/routers/loaders.ts`

## Authentication And Session

- Session initialization and SuperTokens wiring: `packages/web/src/auth/session/SessionProvider.tsx`
- User profile bootstrap: `packages/web/src/auth/context/UserProvider.tsx`
- Auth schemas: `packages/web/src/auth/schemas/auth.schemas.ts`
- Backend auth routes: `packages/backend/src/auth/auth.routes.config.ts`
- Backend auth controllers/services: `packages/backend/src/auth/controllers`, `packages/backend/src/auth/services`

## Events

- Shared event schema/types: `packages/core/src/types/event.types.ts`
- Event helpers and recurrence utilities: `packages/core/src/util/event`
- Web event sagas: `packages/web/src/ducks/events/sagas`
- Web event slices/selectors: `packages/web/src/ducks/events/slices`, `packages/web/src/ducks/events/selectors`
- Elf event entity store: `packages/web/src/store/events.ts`
- Event API/repositories: `packages/web/src/ducks/events/event.api.ts`, `packages/web/src/common/repositories/event`
- Backend event routes: `packages/backend/src/event/event.routes.config.ts`
- Backend event controller/service: `packages/backend/src/event/controllers/event.controller.ts`, `packages/backend/src/event/services/event.service.ts`

## Tasks

- Shared task type used by local storage: `packages/web/src/common/types/task.types.ts`
- Day task hooks: `packages/web/src/views/Day/hooks/tasks`
- Task UI components: `packages/web/src/views/Day/components/TaskList`
- Local storage for tasks: `packages/web/src/common/storage/adapter`

## Day / Week / Now Views

- Day view route and content: `packages/web/src/views/Day/view`
- Day view hooks: `packages/web/src/views/Day/hooks`
- Week/calendar view: `packages/web/src/views/Calendar`
- Week keyboard shortcuts: `packages/web/src/views/Calendar/hooks/shortcuts/useWeekShortcuts.ts`
- Sidebar Someday draft actions: `packages/web/src/views/Calendar/components/Draft/sidebar/hooks/useSidebarActions.ts`
- Now view: `packages/web/src/views/Now`

## Offline Storage

- Adapter singleton and readiness: `packages/web/src/common/storage/adapter/adapter.ts`
- IndexedDB implementation: `packages/web/src/common/storage/adapter/indexeddb.adapter.ts`
- Legacy schema migration: `packages/web/src/common/storage/adapter/legacy-primary-key.migration.ts`
- Data/external migrations: `packages/web/src/common/storage/migrations`

## Sync And Websockets

- Web socket client: `packages/web/src/socket/client/socket.client.ts`
- Web socket hooks: `packages/web/src/socket/hooks`
- Web socket provider: `packages/web/src/socket/provider/SocketProvider.tsx`
- Shared websocket event names: `packages/core/src/constants/websocket.constants.ts`
- Backend websocket server: `packages/backend/src/servers/websocket/websocket.server.ts`
- Backend sync routes/services: `packages/backend/src/sync/sync.routes.config.ts`, `packages/backend/src/sync/services`

## Users / Metadata / Priority

- User queries/services: `packages/backend/src/user`
- Priority feature: `packages/backend/src/priority`
- User metadata service: `packages/backend/src/user/services/user-metadata.service.ts`
- Mobile waitlist gate (web-only external link): `packages/web/src/components/MobileGate/MobileGate.tsx`

## Environment And Infra

- Backend env parsing: `packages/backend/src/common/constants/env.constants.ts`
- Web env parsing: `packages/web/src/common/constants/env.constants.ts`
- Express middleware order: `packages/backend/src/servers/express/express.server.ts`

## CLI / Maintenance

- CLI entrypoint: `packages/scripts/src/cli.ts`
- Build command: `packages/scripts/src/commands/build.ts`
- Delete command: `packages/scripts/src/commands/delete.ts`
- Migration command: `packages/scripts/src/commands/migrate.ts`
- Seeders/migrations: `packages/scripts/src/migrations`, `packages/scripts/src/seeders`

## Test Anchors

- Root Jest project config: `jest.config.js`
- Core test setup: `packages/core/src/__tests__`
- Web test setup: `packages/web/src/__tests__`
- Web memory-router test helper: `packages/web/src/__tests__/utils/providers/MemoryRouter.tsx`
- Backend test setup: `packages/backend/src/__tests__`
- E2E tests: `e2e`
- E2E event helpers: `e2e/utils/event-test-utils.ts`
