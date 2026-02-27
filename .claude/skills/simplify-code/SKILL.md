---
name: simplify-code
description: Simplifies code by minimizing complexity, eliminating duplication, and prioritizing legibility for contributors. Use when implementing features, fixing bugs, refactoring, or when the user asks to simplify, clean up, make DRY, reduce complexity, or improve maintainability.
---

# Simplify Code

Favor minimal, legible implementations. Fewer lines and clearer structure make code easier to understand and maintain.

## Before Making Changes

1. **Necessity**: Does this change only address what's required?
2. **Existing abstractions**: Are there shared utilities, hooks, or helpers in `common/`, `util/`, etc.?
3. **Duplication**: Where else does similar logic exist?
4. **Root cause**: What is actually driving the complexity?

## Core Principles

### Minimal Surface Area

- Prefer the smallest change that achieves the goal
- Add abstractions only when reuse is real and obvious
- Avoid "future-proofing" that adds complexity now

### DRY

- **Literal duplication**: Same logic in 2+ places → extract shared function
- **Similar structure**: Parameterize or compose instead of copying
- **Config-driven branches**: Use maps/objects instead of long switch/if chains
- **Do not over-DRY**: Don't unify logic that merely _looks_ similar; shared abstractions must cleanly handle all real cases

### Legibility

- One clear responsibility per function/component
- Guard clauses and early returns over deep nesting
- Functions under ~20 lines when feasible; flag functions over ~30 lines
- Each line readable without jumping around

### Durability

- Prefer built-ins and stable, minimal dependencies
- Abstractions with narrow, stable contracts
- Avoid hidden state and surprising side effects

## When to Extract vs. Inline

**Extract when:**

- Logic is used in 2+ places with shared intent
- A block has a clear, reusable name
- The abstraction has a narrow, stable API

**Do not extract when:**

- Used once and clear inline
- The abstraction would need many params or special cases
- The abstraction name would be vague (e.g. `doStuff`)

## Complexity Thresholds

| Metric               | Prefer     | Flag       | Action                       |
| -------------------- | ---------- | ---------- | ---------------------------- |
| Function length      | < 20 lines | > 30 lines | Split or extract             |
| Nesting depth        | ≤ 2 levels | > 3 levels | Guard clauses, early returns |
| Parameters           | ≤ 3        | > 4        | Options object or context    |
| Conditional branches | ≤ 3        | > 4        | Map/object or polymorphism   |
| Similar blocks       | 0          | 2+         | Extract and parameterize     |

## DRY Detection Rules

### Extract when you see

- Same expression or block in 2+ places
- Copy-paste with variable name changes only
- Parallel structures (e.g. handlers for A and B that mirror each other)
- Repeated validation, formatting, or mapping logic

### Parameterize when

- Logic is identical except for a value or small behavior
- A good abstraction name exists (e.g. `formatDate`, `validateEmail`)
- The parameter surface is small (< 4 params typically)

### Do not extract when

- Used once and inline logic is clear
- Abstraction would need many optional params or flags
- Name would be generic (`handleThing`, `processData`)
- Only superficial similarity — real behavior diverges
- Combining would obscure intent or create hidden coupling

## Nesting Reduction

**Preferred**: Guard clauses and early returns

```
if (!user?.isActive) return;
if (!user.hasPermission) return;
doThing();
```

**Avoid**: Deep nesting

```
if (user) {
  if (user.isActive) {
    if (user.hasPermission) {
      doThing();
    }
  }
}
```

## Config Over Conditionals

**When**: Multiple similar branches based on a key or type

**Instead of**: Long switch or if-else chain

```
switch (type) {
  case 'a': return handleA();
  case 'b': return handleB();
  case 'c': return handleC();
}
```

**Prefer**: Map or object lookup (when handlers are simple)

```
const handlers = { a: handleA, b: handleB, c: handleC };
return handlers[type]?.();
```

## Project-Aware Simplification

Before adding new abstractions:

1. Search for existing utilities in `common/`, `util/`, `hooks/`
2. Check sibling components or similar views for shared patterns
3. Follow established conventions (e.g. naming, file layout)
4. Prefer composition over new inheritance

## Durability Checklist

- [ ] Abstraction has a clear, narrow contract
- [ ] No hidden globals or mutable shared state
- [ ] Types/interfaces document inputs and outputs
- [ ] Dependencies are minimal and stable
- [ ] Change is incremental; no big-bang refactors

## Anti-Patterns to Avoid

- Abstracting "for the future" without current reuse
- Clever one-liners that obscure intent
- Premature micro-optimization over clarity
- Collapsing unrelated responsibilities into one abstraction
- Overly deep inheritance or generic hierarchies

## Output Format

When proposing simplifications:

1. One-sentence summary of the change
2. Minimal diff or before/after
3. Principle(s) applied (DRY, legibility, etc.)
4. Any tradeoffs noted

## Examples

### Guard Clauses vs. Nesting

**Before:**

```ts
function processUser(user: User | null) {
  if (user) {
    if (user.isActive) {
      if (user.hasPermission) {
        return doThing(user);
      }
    }
  }
  return null;
}
```

**After:**

```ts
function processUser(user: User | null) {
  if (!user?.isActive || !user.hasPermission) return null;
  return doThing(user);
}
```

### Single Pass vs. Repeated Iteration

**Before:**

```ts
const names = items.map((i) => i.name);
const ids = items.map((i) => i.id);
const active = items.filter((i) => i.active);
```

**After** (when two+ iterations over same array):

```ts
const { names, ids, active } = items.reduce(
  (acc, i) => ({
    names: [...acc.names, i.name],
    ids: [...acc.ids, i.id],
    active: i.active ? [...acc.active, i] : acc.active,
  }),
  { names: [] as string[], ids: [] as string[], active: [] as Item[] },
);
```

_Note:_ Keep separate passes if they are clearer; avoid reduce when simple map/filter is more readable.

### Config-Driven Handlers

**Before:**

```ts
function getLabel(type: string) {
  if (type === "email") return "Email";
  if (type === "phone") return "Phone";
  if (type === "address") return "Address";
  return "Unknown";
}
```

**After:**

```ts
const LABELS: Record<string, string> = {
  email: "Email",
  phone: "Phone",
  address: "Address",
};
const getLabel = (type: string) => LABELS[type] ?? "Unknown";
```

### Duplicated Logic → Shared Helper

**Before:**

```ts
// In ComponentA
const formatted = `${user.firstName} ${user.lastName}`.trim();

// In ComponentB
const displayName = `${user.firstName} ${user.lastName}`.trim();
```

**After:**

```ts
// common/util/formatUser.ts
export const formatFullName = (user: { firstName: string; lastName: string }) =>
  `${user.firstName} ${user.lastName}`.trim();
```

### Inline When Single Use

**Before** (over-extraction):

```ts
const getIsValid = (x: number) => x > 0 && x < 100;
if (getIsValid(value)) { ... }
```

**After:**

```ts
if (value > 0 && value < 100) { ... }
```

### Composing Hooks Instead of Duplication

**Before** (similar logic in two components):

```ts
// DayCmdPalette.tsx
const authItems = isLoggedIn ? [logoutItem] : [loginItem, signupItem];

// NowCmdPalette.tsx
const authItems = isLoggedIn ? [logoutItem] : [loginItem, signupItem];
```

**After:**

```ts
// useAuthCmdItems.ts
export const useAuthCmdItems = (isLoggedIn: boolean) =>
  isLoggedIn ? [logoutItem] : [loginItem, signupItem];
```
