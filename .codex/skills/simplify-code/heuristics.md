# Simplify Code — Heuristics

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
