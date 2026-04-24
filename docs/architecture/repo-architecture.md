# Repo Architecture

Compass is a TypeScript monorepo with four packages and one shared event domain.

## Package Map

### `packages/web`

The React frontend. It owns:

- app startup and routing
- auth/session-aware UI
- event and task interactions
- local offline storage
- SSE listeners (`EventSource`)

Key entrypoints:

- `packages/web/src/index.tsx`
- `packages/web/src/components/App/App.tsx`
- `packages/web/src/routers/index.tsx`
- `packages/web/src/views/Root.tsx`

### `packages/backend`

The Express + MongoDB backend. It owns:

- route registration
- Supertokens session enforcement
- event CRUD and recurrence processing
- Google Calendar sync
- SSE fanout

Key entrypoints:

- `packages/backend/src/app.ts`
- `packages/backend/src/servers/express/express.server.ts`
- `packages/backend/src/servers/sse/sse.server.ts`

### `packages/core`

The shared domain layer. It owns:

- Zod schemas and TypeScript types
- shared constants
- date/event utilities
- mapping logic between Compass and provider formats

High-value files:

- `packages/core/src/types/event.types.ts`
- `packages/core/src/types/type.utils.ts`
- `packages/core/src/constants/core.constants.ts`
- `packages/core/src/constants/sse.constants.ts`

### `packages/scripts`

The CLI and database maintenance package. It owns:

- build commands
- delete flows
- database migrations and seeders

Entry point:

- `packages/scripts/src/cli.ts`

## Runtime Boundaries

### Web -> Core

The web package imports shared event/task/date concepts from `core` and should not redefine them locally unless the data is UI-specific.

### Backend -> Core

The backend uses `core` for shared validation, event categories, recurrence scopes, constants, and SSE event names.

### Web <-> Backend

The web talks to the backend through:

- HTTP APIs
- SSE events
- shared domain types from `core`

## Startup Paths

### Frontend boot

`packages/web/src/index.tsx` does this in order:

1. initialize storage
2. start saga middleware
3. initialize session tracking
4. render `<App />`

`<App />` then installs provider trees and the router.

### Backend boot

`packages/backend/src/app.ts` does this in order:

1. create Express app
2. create HTTP server
3. register HTTP routes (SSE is opened per authenticated `GET /api/events/stream`)
4. start Mongo
5. listen on the configured port

## Main Architectural Patterns

### Backend route pattern

`routes.config.ts` -> controller -> service -> query/mongo

This is the standard pattern for new HTTP behavior.

### Web state pattern

Web state is not single-system:

- Redux Toolkit slices hold app state and async state
- redux-saga handles side effects
- Elf stores are used for event entity management and draft/active state
- IndexedDB stores offline events/tasks

Treat this as an intentional mixed architecture, not an inconsistency to "fix" casually.

### Shared schema pattern

The repo prefers:

1. define schema with Zod
2. export inferred TypeScript type
3. consume the same contract in web and backend

## Where Cross-Cutting Changes Usually Land

- New event field: `core` schema, backend parsing/persistence, web editors/selectors/tests
- New backend endpoint: backend route/controller/service plus maybe shared type in `core`
- New SSE event: `core` constants/types, backend `sse.server` / `publish`, web SSE hook consumer
- New local persistence behavior: web storage adapter, migration runner, tests
