# Types And Validation

Compass uses shared Zod-backed contracts to keep web and backend behavior aligned.

## Preferred Pattern

The repo generally prefers:

1. define a Zod schema
2. export the inferred TypeScript type
3. reuse that contract across packages

This keeps runtime validation and compile-time typing close together.

## Shared API Error Contracts

For API errors that the web app needs to understand structurally, use the same pattern as request and response contracts:

1. define a shared base error schema in `packages/core/src/types`
2. export the inferred type
3. extend that base schema for feature-specific error families
4. parse Axios errors on the frontend with `parseApiError(error, schema)`
5. keep any feature-specific parser in a narrowly named helper such as `parseGoogleConnectError(...)`

Current reference files:

- `packages/core/src/types/auth.types.ts`
- `packages/web/src/common/apis/compass.api.util.ts`
- `packages/backend/src/common/errors/handlers/error.handler.ts`

Example:

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

Use the generic base schema for display-only fallbacks such as `getApiErrorMessage(...)`. When a flow needs typed behavior, parse against the specific schema for that flow instead of overloading the generic helper.

## Main Places To Look

### Shared contracts

- `packages/core/src/types`
- `packages/core/src/validators`
- `packages/core/src/types/type.utils.ts`

### Backend request/env validation

- `packages/backend/src/common/constants/env.constants.ts`
- `packages/backend/src/common/validators`
- feature-specific query validators such as `packages/backend/src/sync/util/sync.queries.ts`

### Web form/client validation

- `packages/web/src/auth/schemas`
- `packages/web/src/common/validators`
- feature-specific form hooks such as `packages/web/src/components/AuthModal/hooks/useZodForm.ts`

## Shared Event Contract

The most important shared contract is the event schema in:

- `packages/core/src/types/event.types.ts`

Do not duplicate event field definitions inside `web` or `backend` unless the extra type is intentionally layer-specific.

## ObjectId And String Helpers

The repo has reusable schema helpers in:

- `packages/core/src/types/type.utils.ts`

Examples include:

- object id parsing
- date string parsing
- timezone validation
- hex color validation

Use these helpers before inventing new ad hoc validators.

## Zod Versions In The Repo

The codebase currently uses both:

- `zod`
- `zod/v4`
- `zod/v4-mini`

Be consistent with nearby code when editing. Do not assume the repo is on a single Zod import style yet.

## When To Put A Type In `core`

Put it in `core` when:

- both web and backend use it
- it defines a persisted or API-visible contract
- it encodes domain invariants

This includes API error payloads when:

- the backend emits a stable `code`
- the web needs to branch on that `code`
- multiple callers should reuse the same contract instead of duplicating inline string checks

Keep it local to `web` or `backend` when:

- it is purely presentation or implementation detail
- it only exists to support one runtime layer

## Recommended Workflow For Contract Changes

1. update the shared schema in `core`
2. update inferred types and related helpers
3. update backend parsers/controllers/services
4. update web forms, selectors, and renderers
5. run cross-package tests and `yarn type-check`

For shared API error changes, make that workflow concrete:

1. add or update backend error metadata with a stable `code`
2. confirm the centralized error handler returns that `code`
3. add or update the shared Zod schema in `core`
4. add or update the frontend parser wrapper for the specific flow
5. test both the backend payload and the frontend parser behavior

## Common Pitfalls

- changing a TypeScript interface without updating the Zod schema
- changing web-only types while forgetting the backend contract
- adding a field to storage or API responses without updating normalization
- mixing local-only and shared event/task types unintentionally
- putting an endpoint-specific schema behind a generic helper name
- branching on raw `error.response.data.code` strings in components instead of parsing through a shared schema
