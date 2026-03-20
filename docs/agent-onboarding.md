# Agent Onboarding

This is the fastest accurate path into the Compass codebase for AI agents.

## Start Here

Read these in order:

1. `AGENTS.md` for repo rules, test commands, and naming conventions.
2. `docs/repo-architecture.md` for package boundaries and startup paths.
3. `docs/feature-file-map.md` for "where do I edit?" lookups.
4. `docs/common-change-recipes.md` for safe implementation patterns.

## Current Ground Truth

- The monorepo has four active packages: `packages/web`, `packages/backend`, `packages/core`, and `packages/scripts`.
- The frontend can run standalone with `yarn dev:web`.
- The backend requires valid env configuration and external services.
- Shared domain types and validation live primarily in `packages/core/src`.
- Event behavior spans all three runtime packages: `core`, `web`, and `backend`.

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
- Websocket server: `packages/backend/src/servers/websocket/websocket.server.ts`
- Shared event types: `packages/core/src/types/event.types.ts`
- Shared websocket constants: `packages/core/src/constants/websocket.constants.ts`

## Working Rules That Matter In Practice

- Use module aliases instead of deep relative imports.
- Prefer adding or updating Zod schemas next to shared types in `core`.
- For web changes, test from user behavior, not implementation details.
- For backend routes, follow `routes.config -> controller -> service -> query` flow.
- For event changes, inspect both sync directions before editing only one side.
- Be careful with authenticated vs unauthenticated behavior; Compass supports both local-only and remote-backed flows.

## Known Friction Points

- Web event state is split between Redux slices/sagas and an Elf event store.
- Event recurrence rules and someday behavior have several transition paths.
- IndexedDB initialization and migrations happen before the app fully boots.
- Once a user has authenticated, event repository selection intentionally prefers remote access even if the current session is gone.

## If You Are Touching...

- Auth or session behavior: read `docs/frontend-runtime-flow.md`, `docs/password-auth-flow.md`, and `docs/env-and-dev-modes.md`.
- Backend endpoints: read `docs/backend-request-flow.md`.
- Google sync or websocket behavior: read `docs/google-sync-and-websocket-flow.md`.
- Local persistence: read `docs/offline-storage-and-migrations.md`.
- Event or task shape: read `docs/event-and-task-domain-model.md`.
- Shared schemas: read `docs/types-and-validation.md`.

## Validation Defaults

Run the smallest relevant checks first:

- Core-only changes: `yarn test:core`
- Web-only changes: `yarn test:web`
- Backend-only changes: `yarn test:backend`
- Scripts-only changes: `yarn test:scripts`
- Cross-package type changes: `yarn test:core && yarn test:web && yarn test:backend`
- Before handoff: `yarn type-check`
