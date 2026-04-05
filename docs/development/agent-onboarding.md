# Agent Onboarding

Fastest accurate path into the Compass repo for internal engineers and agents.

## Read In This Order

1. [AGENTS.md](../../AGENTS.md) for repo rules, naming, and command defaults.
2. [Docs Index](../README.md) for topic navigation.
3. [Repo Architecture](../architecture/repo-architecture.md) for package boundaries and startup paths.
4. [Feature File Map](./feature-file-map.md) for "where do I edit?" lookups.
5. [Common Change Recipes](./common-change-recipes.md) for safe implementation patterns.

## Current Ground Truth

- Active packages are `packages/web`, `packages/backend`, `packages/core`, and `packages/scripts`.
- `bun run dev:web` works without backend services.
- Backend, sync, and auth work require valid env plus external services.
- Shared domain contracts live mostly in `packages/core/src`.
- Event behavior crosses `core`, `web`, and `backend`.
- Use Tailwind for new styles (we're moving away from `styled-components`).

## First Commands To Run

```bash
rg --files docs packages
sed -n '1,220p' package.json
sed -n '1,220p' packages/web/src/index.tsx
sed -n '1,220p' packages/backend/src/app.ts
sed -n '1,260p' packages/core/src/types/event.types.ts
```

## High-Value File Anchors

- Web boot: `packages/web/src/index.tsx`
- Web root view: `packages/web/src/views/Root.tsx`
- Web router: `packages/web/src/routers/index.tsx`
- Redux store: `packages/web/src/store/index.ts`
- Event sagas: `packages/web/src/ducks/events/sagas/event.sagas.ts`
- Local storage adapter: `packages/web/src/common/storage/adapter/indexeddb.adapter.ts`
- Backend app startup: `packages/backend/src/app.ts`
- Express wiring: `packages/backend/src/servers/express/express.server.ts`
- Event routes: `packages/backend/src/event/event.routes.config.ts`
- Event controller: `packages/backend/src/event/controllers/event.controller.ts`
- Event service: `packages/backend/src/event/services/event.service.ts`
- Sync service: `packages/backend/src/sync/services/sync.service.ts`
- SSE server: `packages/backend/src/servers/sse/sse.server.ts`
- Shared event types: `packages/core/src/types/event.types.ts`
- Shared SSE event names: `packages/core/src/constants/sse.constants.ts`

## If You Are Touching...

Before implementing or modifying features, consult the relevant requirements doc in `docs/requirements/` (auth, events, google-sync, recurring-events, shortcuts, tasks) to understand expected behavior.

- Auth or session behavior:
  [Frontend Runtime Flow](../frontend/frontend-runtime-flow.md),
  [Password Auth Flow](../features/password-auth-flow.md),
  [Env And Dev Modes](./env-and-dev-modes.md)
- Backend endpoints:
  [Backend Request Flow](../backend/backend-request-flow.md),
  [API Documentation](../backend/api-documentation.md)
- Google sync or SSE behavior:
  [Google Sync And SSE Flow](../features/google-sync-and-sse-flow.md)
- Local persistence:
  [Offline Storage And Migrations](../features/offline-storage-and-migrations.md)
- Event or task shape:
  [Event And Task Domain Model](../architecture/event-and-task-domain-model.md),
  [Recurrence Handling](../features/recurring-events-handling.md)
- Shared schemas:
  [Types And Validation](./types-and-validation.md)

## Known Friction Points

- Web event state is split across Redux, redux-saga, Elf stores, and IndexedDB-backed repositories.
- Recurrence and someday transitions have several planner paths.
- IndexedDB initialization and migrations happen before the app fully boots.
- Once a user has authenticated, repository selection prefers remote access unless Google is explicitly in a revoked state.

## Validation Defaults

- Core-only changes: `bun run test:core`
- Web-only changes: `bun run test:web`
- Backend-only changes: `bun run test:backend`
- Scripts-only changes: `bun run test:scripts`
- Cross-package type changes: `bun run test:core && bun run test:web && bun run test:backend`
- Before handoff: `bun run type-check`
