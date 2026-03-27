# Backend Error Handling

Compass uses typed operational errors plus a centralized Express error handler.

## Principles

- Minimize the number of `try/catch` blocks in the code.

## Source Files

- `packages/backend/src/common/errors/handlers/error.handler.ts`
- `packages/backend/src/common/errors/handlers/error.express.handler.ts`
- feature error metadata files under `packages/backend/src/common/errors/**`
- `packages/core/src/errors/errors.base.ts`

## Main Pattern

Preferred backend pattern:

1. define reusable error metadata in the relevant feature file
2. create a `BaseError` through `error(...)`
3. let controller/service code throw that error
4. let centralized Express handling turn it into the client payload

Example:

```ts
import { AuthError } from "@backend/common/errors/auth/auth.errors";
import { error } from "@backend/common/errors/handlers/error.handler";

throw error(AuthError.MissingRefreshToken, "Google connection required");
```

## Client Payload Rules

For `BaseError`, backend responses are intentionally small:

- `result`: short result string
- `message`: safe user-facing description

Internal details such as stack traces and operational flags stay server-side.

## Unexpected Error Rules

- non-`BaseError` values are routed through `handleExpressError(...)`
- Google API errors get special handling for revoked tokens, invalid values, and full-sync recovery
- programmer errors can terminate the process after logging

## Guidance

- Keep `result` short and stable.
- Put technical detail in logs, not in the client payload.
- Prefer reusing existing feature error metadata before inventing new names.
- If the error should trigger special auth/sync behavior, verify both API handling and websocket side effects.

## Adding New Backend Errors

When you need a new operational backend error:

1. add metadata to the closest feature error file under `packages/backend/src/common/errors/**`
2. throw it with `error(...)` from service/controller code
3. log any extra debugging context before throwing

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
