# Feature File Map

Use this document to find the first files to inspect for common Compass changes.

## App Boot And Routing

- Frontend bootstrap: `packages/web/src/index.tsx`
- App provider tree: `packages/web/src/components/App/App.tsx`
- Root authenticated shell: `packages/web/src/views/Root.tsx`
- Router config: `packages/web/src/routers/index.tsx`
- Router loaders: `packages/web/src/routers/loaders.ts`
- Client version polling: `packages/web/src/components/Sidebar/SidebarActions/useVersionCheck.ts`
- Update CTA wiring: `packages/web/src/components/Sidebar/SidebarActions/SidebarActions.tsx`

## Authentication And Session

- Session initialization and SuperTokens wiring: `packages/web/src/auth/compass/session/SessionProvider.tsx`
- User profile bootstrap: `packages/web/src/auth/compass/user/context/UserProvider.tsx`
- Google authorization app flow: `packages/web/src/auth/google/authorization`
- Google redirect callback: `packages/web/src/views/GoogleAuthCallback/GoogleAuthCallback.tsx`
- Google authorization intent storage: `packages/web/src/auth/google/authorization/google-authorization.storage.ts`
- Auth schemas: `packages/web/src/auth/compass/schemas/auth.schemas.ts`
- Backend auth routes: `packages/backend/src/auth/auth.routes.config.ts`
- Backend auth controllers/services: `packages/backend/src/auth/controllers`, `packages/backend/src/auth/services`

## Events

- Shared event schema/types: `packages/core/src/types/event.contracts.ts`
- Event helpers and recurrence utilities: `packages/core/src/util/event`
- Web Event reads, cache utilities, and view models: `packages/web/src/events/queries`
- Web Event persisted mutations and pending state: `packages/web/src/events/mutations`
- Web Event draft/interaction Zustand state: `packages/web/src/events/stores/draft.store.ts`
- Event API/repositories: `packages/web/src/events/event.api.ts`, `packages/web/src/events/repositories`
- Backend event routes: `packages/backend/src/event/event.routes.config.ts`
- Backend event controller/service: `packages/backend/src/event/controllers/event.controller.ts`, `packages/backend/src/event/services/event.service.ts`

## Attendees, Contacts, And RSVP

Full flow diagram, invitation-intent semantics, merge/replay rules, contacts
consent flow, and named warts: [Attendees, Contacts, And
RSVP](../features/attendees.md).

- Attendee/RSVP write contracts: `packages/core/src/types/event-command.contracts.ts`, `packages/core/src/types/event-attendance.contracts.ts`
- Guest-list editor: `packages/web/src/views/Forms/EventForm/AttendeeField/AttendeeField.tsx`
- RSVP status badge and tally: `packages/web/src/views/Forms/EventForm/AttendeeRsvpStatus.tsx`, `packages/web/src/views/Forms/EventForm/attendee-rsvp.ts`, `packages/web/src/views/Forms/EventForm/EventDetailsSection.tsx`
- Save-time invitation prompt: `packages/web/src/views/Forms/EventForm/SendInvitationsDialog.tsx`, `packages/web/src/views/Forms/hooks/useSaveEventForm.ts`
- RSVP control and scope dialog: `packages/web/src/views/Forms/EventForm/RsvpControl.tsx`, `packages/web/src/views/Forms/EventForm/RsvpScopeDialog.tsx`
- Contact suggestions hook: `packages/web/src/views/Forms/EventForm/AttendeeField/useContactSuggestions.ts`
- Backend translation (create/update/delete/rsvp commands, `ATTENDEES_UNSUPPORTED`): `packages/backend/src/common/services/sync-service/event-command.translation.ts`, `packages/backend/src/event/controllers/event.controller.ts`
- Backend contacts proxy: `packages/backend/src/contacts/controllers/contacts.controller.ts`
- Sync attendee merge and RSVP execution: `packages/sync/src/domain/merge-update-content.ts`, `packages/sync/src/domain/provider-command.service.ts`
- Sync Google writer/people adapters: `packages/sync/src/providers/google/google-event-writer.adapter.ts`, `packages/sync/src/providers/google/google-people.adapter.ts`
- E2e coverage: `e2e/attendees/`

## Day / Week Views

- Day view route and content: `packages/web/src/views/Day/view`
- Day view header (includes sidebar toggle control): `packages/web/src/views/Day/components/Header/Header.tsx`
- Day keyboard shortcuts (thin key registration): `packages/web/src/views/Day/hooks/shortcuts/useDayViewShortcuts.ts`
- Week keyboard shortcuts (thin key registration): `packages/web/src/views/Week/hooks/shortcuts/useWeekViewShortcuts.ts`
- Week shortcut owner (draft create/nav/focus + bus): `packages/web/src/views/Week/hooks/shortcuts/useWeekShortcutOwner.ts`
- Shared grid edit/focus shortcuts: `packages/web/src/grid/shortcuts/useGridEventEditShortcuts.ts`, `focus-adjacent-grid-event.ts`
- Day column set when Google is connected (hides local Compass column): `packages/web/src/views/Day/components/Calendar/dayCalendarColumns.util.ts`
- All-day event color wash on day columns: `packages/web/src/grid/utils/allDayColumnTint.util.ts`
- Day view hooks: `packages/web/src/views/Day/hooks`
- Week view: `packages/web/src/views/Week`
- Responsive layout controller (auto-collapse on breakpoint crossings): `packages/web/src/components/AuthenticatedLayout/useResponsiveLayout.ts`
- Dedication dialog implementation (native `dialog` + hotkeys): `packages/web/src/views/Week/components/Dedication/Dedication.tsx`
- Dedication dialog mount points:
  - week view: `packages/web/src/views/Week/WeekView.tsx`
  - day view: `packages/web/src/views/Day/view/DayViewContent.tsx`

## Keyboard Shortcuts

Authoritative legend data and taught bindings live under
`packages/web/src/shortcuts`. View owners register keys; do not duplicate
labels outside the registry.

- Registry (source of truth for `?` legend): `packages/web/src/shortcuts/shortcuts.registry.ts`
- Taught bindings (handlers + Shortcut Showcase keycaps): `packages/web/src/shortcuts/keymap.ts`
- Sidebar next-shortcut selector: `packages/web/src/shortcuts/tips/selectShortcutHint.ts`
- Sidebar tip progress (demonstrated primitives): `packages/web/src/shortcuts/tips/shortcut-tips.progress.store.ts`
- Global shell shortcuts (sidebar `]`, palette, settings, navigation): `packages/web/src/shortcuts/useGlobalShortcuts.ts`
- Event-jump chips (`S`): `packages/web/src/shortcuts/shift-hint/`
- Pointer suppression (mouse permanently inert; keyboard clicks pass): `packages/web/src/shortcuts/keyboard-only/`
- Escape ownership (modals/form before lower handlers): `packages/web/src/shortcuts/escape-ownership.ts`
- App lock (suppress shortcuts while a modal owns the UI): `packages/web/src/shortcuts/app-lock.ts`
- Mount point for global + pointer-suppression hooks: `packages/web/src/components/RootShell/RootShell.tsx`
- Acceptance runbook: [Shortcuts](../acceptance/shortcuts.md)

## Welcome, Showcase, And First-Event Handoff

Anonymous calendar onboarding (welcome modal, Shortcut Showcase, first-event
prompt) lives under
`packages/web/src/components/{WelcomeModal,ShortcutShowcase,FirstEventPrompt}`.
The flow, its entry points, and the storage contract are documented in
[Frontend Runtime Flow](../frontend/frontend-runtime-flow.md#welcome-showcase-and-first-event-handoff).

## Sidebar

- Shared sidebar shell: `packages/web/src/components/Sidebar/Sidebar.tsx`
- Month picker: `packages/web/src/components/Sidebar/MonthPicker/MonthPicker.tsx`
- Shared account sync-status + CTA labels: `packages/web/src/components/Sidebar/CalendarList/useAccountHeaderStatus.ts`
- Account identity/sync indicator: `packages/web/src/components/Sidebar/CalendarList/CalendarListHeader.tsx`, `AccountSectionHeader.tsx`
- Sidebar actions and shortcuts overlay: `packages/web/src/components/Sidebar/SidebarActions/SidebarActions.tsx`, `packages/web/src/components/Sidebar/ShortcutsOverlay/ShortcutsOverlay.tsx`
- Week mount point: `packages/web/src/views/Week/WeekView.tsx`
- Day mount point: `packages/web/src/views/Day/view/DayViewContent.tsx`

## Offline Storage

- Offline data store singleton and readiness: `packages/web/src/common/storage/offline-data/offline-data.store.registry.ts`
- IndexedDB implementation: `packages/web/src/common/storage/offline-data/indexeddb-offline-data.store.ts`
- Legacy schema migration: `packages/web/src/common/storage/offline-data/legacy-primary-key.migration.ts`
- Data/external migrations: `packages/web/src/common/storage/migrations`
- Browser key-value state: `packages/web/src/common/storage/browser-key-value.store.ts`

## Sync And SSE

- SSE client: `packages/web/src/sse/client/sse.client.ts`
- SSE hooks: `packages/web/src/sse/hooks`
- Focus refresh (silent Sync catch-up on mount / long hide): `packages/web/src/sse/hooks/useSyncFocusRefresh.ts`
- Shared “visible after hidden” helper: `packages/web/src/common/hooks/useVisibleAfterHidden.ts`
- Google refresh coordinator: `packages/web/src/auth/google/state/google.sync.refresh.ts`
- SSE provider: `packages/web/src/sse/provider/SSEProvider.tsx`
- SSE transport constant + message union: `packages/core/src/constants/sse.constants.ts`, `packages/core/src/types/server-message.contracts.ts`
- Backend SSE server: `packages/backend/src/servers/sse/sse.server.ts`
- Events stream route: `packages/backend/src/events/events.routes.config.ts`
- Sync change-feed poller (backend → Sync): `packages/backend/src/servers/sse/sync-change-feed.bridge.ts`
- Sync invalidation → SSE message translation: `packages/backend/src/servers/sse/sync-invalidation.to-server-message.ts`
- Google revoked/pruned handling: `packages/backend/src/common/services/gcal/google-revoked.util.ts`
- Backend Sync client: `packages/backend/src/common/services/sync-service/`

### Standalone Sync Service (`packages/sync`)

Owns Google Calendar sync end to end (OAuth, webhooks, imports, jobs) —
see [Google Sync And SSE Flow](../features/google-sync-and-sse-flow.md) for
the full picture.

- Service entrypoint + internal routes: `packages/sync/src/app.ts`, `packages/sync/src/server/`
- Failed-job self-heal sweep: `packages/sync/src/domain/failed-job-requeue.service.ts` (wired from `packages/sync/src/app.ts`)
- Operator CLI for exhausted jobs: [CLI](./cli.md#manage-exhausted-sync-jobs)
- Diagnostics / retention / principal purge: `packages/sync/src/server/diagnostic.routes.ts`, `packages/sync/src/domain/connection-retention.service.ts`, `packages/sync/src/domain/principal-purge.service.ts`
- Sync DB backup/restore CLI: `packages/scripts/src/commands/sync-backup.ts`, `sync-restore.ts`

## Users / Metadata

- User queries/services: `packages/backend/src/user`
- User metadata service: `packages/backend/src/user/services/user-metadata.service.ts`
- Mobile waitlist gate (web-only external link): `packages/web/src/components/MobileGate/MobileGate.tsx`

## Billing And Trial

- Shared plan/price copy: `packages/core/src/constants/billing.constants.ts`
- Anonymous trial clock: `packages/web/src/billing/trial.storage.ts`, `packages/web/src/billing/useTrialStatus.ts`
- Server access + paid gate: `packages/web/src/billing/useAppAccess.ts`, `packages/web/src/billing/BillingGateModal.tsx`
- Backend billing: `packages/backend/src/billing`
- Overview: [Billing And Trial](../features/billing.md)

## Environment And Infra

- Backend config parsing: `packages/backend/src/common/constants/config.constants.ts`
- Web env parsing: `packages/web/src/common/constants/env.constants.ts`
- Express middleware order: `packages/backend/src/servers/express/express.server.ts`
- Health endpoint route/controller/tests: `packages/backend/src/health/health.routes.config.ts`, `packages/backend/src/health/controllers/health.controller.ts`, `packages/backend/src/health/controllers/health.controller.db.test.ts`
- Self-host compose profile derivation (`selfhosted` / `sync` from `compass.yaml`): `self-host/config.sh` (sourced by `install.sh`, `install-manual.sh`, and `~/compass/compass`)

## CLI / Maintenance

- CLI entrypoint: `packages/scripts/src/cli.ts`
- Build commands: `packages/scripts/src/commands/build.backend.ts`, `build.sync.ts`
- Other CLI commands: see [CLI](./cli.md)

## Test Anchors

- Per-file test launchers: `packages/scripts/src/testing/test-mongo-env.ts` (Mongo packages), `packages/scripts/src/testing/test-parallel.ts` (core + web + fast tiers)
- Web injectable test seams (session, toast, Google auth): `packages/web/src/__tests__/helpers/web-test-seams.ts`
- Core test setup: `packages/core/src/__tests__`
- Web test setup: `packages/web/src/__tests__`
- Web mock server handlers: `packages/web/src/__tests__/__mocks__/server/mock.handlers.ts`
- Web test router helper: `packages/web/src/__tests__/utils/providers/createTestRouter.tsx`
- Backend test setup: `packages/backend/src/__tests__`
- E2E tests: `e2e`
