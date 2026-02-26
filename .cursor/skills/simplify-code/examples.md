# Simplify Code — Examples

## Guard Clauses vs. Nesting

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

## Single Pass vs. Repeated Iteration

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

## Config-Driven Handlers

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

## Duplicated Logic → Shared Helper

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

## Inline When Single Use

**Before** (over-extraction):

```ts
const getIsValid = (x: number) => x > 0 && x < 100;
if (getIsValid(value)) { ... }
```

**After:**

```ts
if (value > 0 && value < 100) { ... }
```

## Composing Hooks Instead of Duplication

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
