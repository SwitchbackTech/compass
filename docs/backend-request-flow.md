# Backend Request Flow

Compass backend code follows a consistent route -> controller -> service pattern with middleware-heavy request setup.

## Startup And Route Registration

Primary files:

- `packages/backend/src/app.ts`
- `packages/backend/src/servers/express/express.server.ts`

Express startup does this:

1. initialize SuperTokens
2. install request middleware
3. install CORS and SuperTokens middleware
4. install helmet, logging, and JSON parsing
5. register route config classes (including unauthenticated health check route)
6. install the SuperTokens error handler after routes

## Route Config Pattern

Each feature owns a `*routes.config.ts` file that extends `CommonRoutesConfig`.

Base class:

- `packages/backend/src/common/common.routes.config.ts`

Typical ownership split:

- routes config: express path and middleware composition
- controller: request parsing and response orchestration
- service: business logic
- query/repo layer: database-specific access

## Middleware Order Matters

The backend relies on middleware ordering for correct behavior:

- request/response promise helpers are installed before routes
- session middleware runs before route handlers that require auth
- SuperTokens error handling runs after routes

If a new route behaves strangely, verify it is registered inside `initExpressServer()` and uses the expected middleware stack.

## Health Check Endpoint Pattern

Files:

- `packages/backend/src/health/health.routes.config.ts`
- `packages/backend/src/health/controllers/health.controller.ts`

`GET /api/health` is registered as a lightweight operational endpoint:

- no `verifySession()` requirement
- controller performs `mongoService.db.admin().ping()`
- response contract is intentionally small: `{ status, timestamp }`
- returns `200` (`status: "ok"`) on successful DB ping, `500` (`status: "error"`) on failure

This route is suitable for uptime probes and quick backend triage, but it is not a deep dependency readiness check beyond database reachability.

## Response Pattern

File:

- `packages/backend/src/common/middleware/promise.middleware.ts`

The backend decorates `res` with `res.promise(...)` so controllers can pass:

- a Promise
- a sync function
- a resolved value

Errors funnel through shared Express error handling.

Important response convention:

- controllers can return `{ statusCode: 204 }` to emit a true empty `204 No Content` response
- this is handled centrally in `promise.middleware.ts` (status-only payload special case)
- avoids duplicating `res.status(...).send()` patterns in controllers

## Event Request Example

Files:

- `packages/backend/src/event/event.routes.config.ts`
- `packages/backend/src/event/controllers/event.controller.ts`
- `packages/backend/src/event/services/event.service.ts`

For `POST /api/event`:

1. route requires `verifySession()`
2. route also requires `requireGoogleConnectionSession` for create
3. controller adds the authenticated user id
4. controller normalizes single vs array payloads
5. controller forwards the change set to `CompassSyncProcessor`
6. controller returns a status-only payload (`{ statusCode: 204 }`) through `res.promise(...)`
7. processor persists and syncs changes, then notifies clients

`PUT /api/event/:id` and `DELETE /api/event/:id` follow the same write pattern:

- route-level auth + Google connection guards
- thin controller shaping into `CompassEvent`
- `res.promise(...)`-based response and centralized error routing

## Common Auth Guards

Frequently used middleware:

- `verifySession()`: authenticated Compass session required
- `requireGoogleConnectionSession`: active Google connection required
- `authMiddleware.verifyIsDev`: development-only route
- `authMiddleware.verifyIsFromCompass`: trusted internal caller
- `authMiddleware.verifyIsFromGoogle`: trusted Google notification source

Intentional unauthenticated route:

- `GET /api/health`: monitoring endpoint that checks DB connectivity

## Validation Placement

Validation is spread across a few layers:

- env validation at startup through Zod
- shared data schemas in `packages/core/src/types`
- query validation in feature utilities where needed
- controller/service parsing for request-specific inputs

When adding a public contract, prefer creating or extending a shared schema in `core` first.

## How To Add A Backend Endpoint

1. Add or reuse a shared schema/type in `core` if the contract is cross-package.
2. Register the route in the relevant `*routes.config.ts`.
3. Keep the controller thin: extract params, user id, and response orchestration only.
4. Put business logic in a service.
5. Add or update tests at the controller/service level.
6. If the endpoint affects realtime UI, check whether a websocket notification is also needed.

## Where Bugs Usually Hide

- middleware ordering
- session requirement mismatches
- user id injection in controllers
- recurring event scope handling
- Mongo/ObjectId conversion around event ids
- returning instance events without rehydrating recurrence rules
