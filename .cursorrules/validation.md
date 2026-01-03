# Validation Standards

This rule enforces validation patterns using Zod for the Compass codebase.

## Use Zod for All Validation

In API endpoints, data processing, and type definitions, use Zod for validation.

## Pattern

1. Define return types with Zod schemas
2. Export types generated from schemas
3. Use schemas for runtime validation

## Example

```typescript
import { z } from "zod";

// Define schema
const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().optional(),
});

// Export type from schema
export type User = z.infer<typeof UserSchema>;

// Use for validation
function validateUser(data: unknown): User {
  return UserSchema.parse(data);
}
```

## API Endpoints (packages/backend)

Use Zod schemas to validate request bodies and query parameters.

**Example:**

```typescript
import { z } from "zod";

const CreateEventSchema = z.object({
  title: z.string().min(1),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  description: z.string().optional(),
});

export type CreateEventRequest = z.infer<typeof CreateEventSchema>;

// In controller
async function createEvent(req: Request, res: Response) {
  const validated = CreateEventSchema.parse(req.body);
  // ... rest of logic
}
```

## Shared Types (packages/core)

Define shared validation schemas in `packages/core/src/validators/`.

**Real example:**

- `packages/core/src/validators/event.validator.ts`

## Benefits

- Runtime type safety
- Automatic type inference
- Clear validation error messages
- Single source of truth for types and validation

## Summary

- Use Zod for all validation
- Define schemas, export inferred types
- Validate API inputs and outputs
- Share schemas in `@core/validators`
