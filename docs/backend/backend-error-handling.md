# Backend Error Handling

Compass uses typed operational errors plus a centralized Express error handler.

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
