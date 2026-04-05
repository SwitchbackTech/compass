# Feature File Map

Use this document to find the first files to inspect for common Compass changes.

## App Boot And Routing

- Frontend bootstrap: `packages/web/src/index.tsx`
- App provider tree: `packages/web/src/components/App/App.tsx`
- Root authenticated shell: `packages/web/src/views/Root.tsx`
- Router config: `packages/web/src/routers/index.tsx`
- Router loaders: `packages/web/src/routers/loaders.ts`
- Client version polling: `packages/web/src/common/hooks/useVersionCheck.ts`
- Update CTA wiring: `packages/web/src/views/Calendar/components/Sidebar/SidebarIconRow/SidebarIconRow.tsx`

## Authentication And Session

- Session initialization and SuperTokens wiring: `packages/web/src/auth/session/SessionProvider.tsx`
- User profile bootstrap: `packages/web/src/auth/context/UserProvider.tsx`
- Google OAuth app flow: `packages/web/src/auth/hooks/google/useGoogleAuth/useGoogleAuth.ts`, `packages/web/src/auth/hooks/google/useGoogleAuthWithOverlay/useGoogleAuthWithOverlay.ts`
- Google OAuth provider wrapper: `packages/web/src/auth/hooks/google/useGoogleLogin/useGoogleLogin.ts`
- Popup-cancel classification for Google OAuth: `packages/web/src/auth/google/google-oauth-error.util.ts`
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
- Drag handle floating placement guard: `packages/web/src/views/Day/components/Task/DraggableTask.tsx`
- Local storage for tasks: `packages/web/src/common/storage/adapter`

## Day / Week / Now Views

- Day view route and content: `packages/web/src/views/Day/view`
- Day view header (includes shortcuts toggle control): `packages/web/src/views/Day/components/Header/Header.tsx`
- Day shortcuts sidebar component: `packages/web/src/views/Day/components/ShortcutsSidebar/ShortcutsSidebar.tsx`
- Shared responsive sidebar state hook (`xl` breakpoint behavior): `packages/web/src/common/hooks/useSidebarState.ts`
- Day keyboard shortcuts (includes `[` toggle): `packages/web/src/views/Day/hooks/shortcuts/useDayViewShortcuts.ts`
- Week keyboard shortcuts (week navigation, draft creation, Someday hotkeys): `packages/web/src/views/Calendar/hooks/shortcuts/useWeekShortcuts.ts`
- Day view hooks: `packages/web/src/views/Day/hooks`
- Week/calendar view: `packages/web/src/views/Calendar`
- Now view: `packages/web/src/views/Now`
- Now keyboard shortcuts (includes `[` toggle): `packages/web/src/views/Now/shortcuts/useNowShortcuts.ts`
- Dedication dialog implementation (native `dialog` + hotkeys): `packages/web/src/views/Calendar/components/Dedication/Dedication.tsx`
- Dedication dialog mount points:
  - week view: `packages/web/src/views/Calendar/Calendar.tsx`
  - day view: `packages/web/src/views/Day/view/DayViewContent.tsx`

## Calendar Sidebar

- Sidebar shell and tab rendering: `packages/web/src/views/Calendar/components/Sidebar/Sidebar.tsx`
- Footer icon row actions (tasks/month, command palette, sync/update): `packages/web/src/views/Calendar/components/Sidebar/SidebarIconRow/SidebarIconRow.tsx`
- Someday sidebar add controls (tooltip shortcuts + create actions): `packages/web/src/views/Calendar/components/Sidebar/SomedayTab/SomedayEvents/SomedayEventsContainer/SomedayEventsContainer.tsx`
- Sidebar layout constants and icon group styling: `packages/web/src/views/Calendar/components/Sidebar/styled.ts`
- Command palette labels and create actions for shortcut parity: `packages/web/src/views/CmdPalette/CmdPalette.tsx`
- Google connection/status UI contract for sidebar + command palette: `packages/web/src/auth/hooks/google/useConnectGoogle/useConnectGoogle.ts`
- Sidebar icon row behavior tests: `packages/web/src/views/Calendar/components/Sidebar/SidebarIconRow/SidebarIconRow.test.tsx`

## Offline Storage

- Adapter singleton and readiness: `packages/web/src/common/storage/adapter/adapter.ts`
- IndexedDB implementation: `packages/web/src/common/storage/adapter/indexeddb.adapter.ts`
- Legacy schema migration: `packages/web/src/common/storage/adapter/legacy-primary-key.migration.ts`
- Data/external migrations: `packages/web/src/common/storage/migrations`

## Sync And SSE

- SSE client: `packages/web/src/sse/client/sse.client.ts`
- SSE hooks: `packages/web/src/sse/hooks`
- SSE provider: `packages/web/src/sse/provider/SSEProvider.tsx`
- Shared SSE event names: `packages/core/src/constants/sse.constants.ts`
- Backend SSE server: `packages/backend/src/servers/sse/sse.server.ts`
- Events stream route: `packages/backend/src/events/events.routes.config.ts`
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
- Health endpoint route/controller/tests: `packages/backend/src/health/health.routes.config.ts`, `packages/backend/src/health/controllers/health.controller.ts`, `packages/backend/src/health/controllers/health.controller.test.ts`

## CLI / Maintenance

- CLI entrypoint: `packages/scripts/src/cli.ts`
- Build command: `packages/scripts/src/commands/build.ts`
- Delete command: `packages/scripts/src/commands/delete.ts`
- Migration command: `packages/scripts/src/commands/migrate.ts`
- Seeders/migrations: `packages/scripts/src/migrations`, `packages/scripts/src/seeders`

## Test Anchors

- Retained Jest project config for `web`, `backend`, and `scripts`: `jest.config.js`
- Core test setup: `packages/core/src/__tests__`
- Web test setup: `packages/web/src/__tests__`
- Web mock server handlers: `packages/web/src/__tests__/__mocks__/server/mock.handlers.ts`
- Web floating-ui test setup: `packages/web/src/__tests__/floating-ui.setup.ts`
- Web memory-router test helper: `packages/web/src/__tests__/utils/providers/MemoryRouter.tsx`
- Backend test setup: `packages/backend/src/__tests__`
- E2E tests: `e2e`
