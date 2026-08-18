# Backend Error Handling

Compass uses typed operational errors plus a centralized Express error handler.

## Principles

- Minimize the number of `try/catch` blocks in the code.
- Never return non-HTTP statuses such as `Status.UNSURE` (600) on live paths.
- Event mutation routes use the `EventMutationError` envelope
  (`code` / `message` / `retryable`). Unknown/programmer errors are
  **non-retryable 500** — only true Sync/provider failures stay retryable
  `PROVIDER_FAILURE`.
- Sync proxy failures on calendar/auth reads use `throwSyncProxyFailure` /
  `unwrapSyncResult` (503/502), never `GenericError.NotSure`.

## Source Files

- `packages/backend/src/common/errors/handlers/error.handler.ts`
- `packages/backend/src/common/errors/handlers/error.express.handler.ts`
- `packages/backend/src/common/services/sync-service/sync-proxy-error.ts`
- `packages/backend/src/event/event.error.ts`
- feature error metadata files under `packages/backend/src/common/errors/**`
- `packages/core/src/errors/errors.base.ts`

## Main Pattern

Preferred backend pattern:

1. define reusable error metadata in the relevant feature file
2. create a `BaseError` through `error(...)`
3. let controller/service code throw that error
4. let centralized Express handling (`res.promise` → `handleExpressError`) turn it into the client payload

Event mutation controllers may catch locally and call `toEventMutationError`
so the strict `{ code, message, retryable }` envelope is preserved. User
controllers return JSON via `toClientErrorPayload` (or `{ code, message }` for
unexpected errors) rather than empty bodies.

Example:

```ts
import { AuthError } from "@backend/common/errors/auth/auth.errors";
import { error } from "@backend/common/errors/handlers/error.handler";

throw error(AuthError.SyncConnectionUnavailable, "Could not reach sync");
```

## Client Payload Rules

For `BaseError`, backend responses are intentionally small:

- `result`: short result string
- `message`: safe user-facing description
- `code`: optional stable machine-readable identifier for frontend branching

Event mutations use `{ code, message, retryable }` instead.

Internal details such as stack traces and operational flags stay server-side.

## Unexpected Error Rules

- non-`BaseError` values are routed through `handleExpressError(...)` when using `res.promise`
- Sync client failures map to 502/503 (or typed mutation codes) — never HTTP 600
- programmer errors can terminate the process after logging when `isOperational` is false

## Guidance

- Keep `result` short and stable.
- Add a `code` when the frontend needs to branch on a specific operational error.
- Keep `code` stable and machine-oriented. Prefer values like `GOOGLE_ACCOUNT_ALREADY_CONNECTED`.
- Put technical detail in logs, not in the client payload.
- Prefer reusing existing feature error metadata before inventing new names.
- If the error should trigger special auth/sync behavior, verify both API handling and SSE side effects.

## Shared Frontend-Backend Error Pattern

When a backend error needs typed frontend handling:

1. add the backend error metadata in `packages/backend/src/common/errors/**` with a stable `code`
2. let `error(...)` create the `BaseError`
3. expose the safe payload through the centralized handler in `packages/backend/src/common/errors/handlers/error.handler.ts`
4. define the shared response schema in `packages/core/src/types`
5. parse the error on the web side with a feature-specific wrapper around `parseApiError(...)`

Example shape:

```ts
export const ApiErrorResponseSchema = z.object({
  code: z.string(),
  message: z.string().min(1),
});

export const GoogleConnectErrorResponseSchema = ApiErrorResponseSchema.extend({
  code: z.enum([
    "GOOGLE_ACCOUNT_ALREADY_CONNECTED",
    "GOOGLE_CONNECT_EMAIL_MISMATCH",
  ]),
});
```

Keep shared parsing generic with `parseApiError(error, schema)`. If a flow needs more than display-only fallback behavior, add a feature-specific parser such as `parseGoogleConnectError(...)` instead of baking one endpoint's schema into a generic helper name.

## Adding New Backend Errors

When you need a new operational backend error:

1. add metadata to the closest feature error file under `packages/backend/src/common/errors/**`
2. throw it with `error(...)` from service/controller code
3. log any extra debugging context before throwing
4. if the web app needs typed handling, add or extend a shared schema in `packages/core/src/types`
5. add frontend parsing through `parseApiError(...)` plus a focused unit test

Example:

```ts
import { error } from "@backend/common/errors/handlers/error.handler";
import { UserError } from "@backend/common/errors/user/user.errors";

logger.error("Delete auth cleanup failed", { userId, summary, err });
throw error(UserError.DeleteCleanupFailed, "Delete Failed");
```

Do not introduce ad-hoc `Error` subclasses for operational backend failures. If
you need extra context like partial summaries, request payloads, or third-party
responses, log that context and still throw a standard `BaseError` via
`error(...)`.
