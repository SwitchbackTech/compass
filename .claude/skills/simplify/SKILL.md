---
name: simplify
description: Review changed code in this repo for reuse, duplication, and unnecessary complexity — including overuse of useEffect/useRef/useState in React — then apply legibility-focused fixes using Compass conventions (Bun/Biome, packages/core|web|backend|scripts, Zustand stores). Quality only — it does not hunt for correctness bugs; use /code-review for that. Use when asked to simplify, clean up, make DRY, reduce complexity, or improve maintainability, or proactively while implementing features, fixing bugs, or refactoring.
---

# Simplify

Favor the smallest, clearest implementation. Fewer lines and less indirection
make code easier for other contributors to verify and change.

## Scope

- Default target is the current diff (`git diff` against the base branch). If
  the user names a specific file, component, or feature instead, scope to
  that.
- Quality only: reuse, duplication, legibility, efficiency. Do not hunt for
  correctness bugs, security issues, or missing edge-case handling — that's
  `/code-review`.
- Workflow: find existing abstractions first → apply the principles below →
  verify with focused checks → report the diff with principles applied.

## Finding Complexity — Where to Start

Don't read the diff top to bottom hoping smells jump out. Hunt with
detectors, in rough order of payoff (each proven on this codebase):

1. **Size first.** `git diff <base> --numstat | sort -rn | head -20` — the
   biggest churn concentrates the smells. Start there, not alphabetically.
2. **Comment density.** Simple code is mostly self-explanatory. A paragraph
   of comments explaining _why something works_ means the mechanism is too
   clever — fix the mechanism and the comments evaporate (a test-override
   registry that needed the same 6-line explanation in five files collapsed
   into ordinary constructor defaults that needed none). One-liners that
   restate the next line (`// save the event`) are pure deletions. Keep only
   comments stating a constraint the code cannot show (transaction
   boundaries, spec references, cross-realm quirks).
3. **Mock volume and shape.** Lots of mocks = missing seam. `mock.module` on
   a shared singleton is the worst offender: it mutates the process-wide
   module registry, cannot be un-leaked for already-linked consumers, and
   fails order-dependently (Linux CI orders files differently than macOS).
   The fix is never better mock bookkeeping — it's a constructor/parameter
   default (`constructor(getStore = getOfflineDataStore)`) and a plain fake.
   Search: `rg "mock.module" --glob "*.test.*"` and treat each hit on a
   multi-consumer module as a candidate seam.
4. **Test-only hooks in production code.** Any `setXForTests`,
   `testOverrides`, `__test__` export, or `if (process.env.NODE_ENV ===
"test")` branch in a production module means tests are steering design
   from the wrong side. Replace with dependency injection at the caller.
5. **Casts.** `as unknown as`, `as any`, and `Parameters<...>[n]` casts in
   tests mean the fake isn't shaped like the real collaborator — usually
   because the seam is a whole module instead of a small interface. In
   production code, casts at construction sites of branded/validated types
   are tolerable; casts that silence a structural mismatch are debt.
   Search: `rg "as unknown as"`.
6. **Copy-pasted scaffolding.** The same open/do/close or
   iterate/write/guard shape repeated across siblings (session +
   transaction + endSession in four service methods; seven cache writers
   each re-implementing iterate-entries → setQueryData → null-guard). Extract
   ONE helper owning the shape; the variants become one-liners.
7. **Dead and unreachable code.** Every exported symbol in the diff:
   `rg "<name>" --type ts` across all packages — zero call sites means
   delete (including its tests). Every defensive branch: read the callee —
   a `!x.isActive` check after a query that already filters `isActive: true`
   can never fire and only misleads readers about invariants.
8. **Coupling via hidden shared state.** Tests that pass alone but fail in
   suite (or only on CI) point at module-level mutable state that no reset
   registry covers. The fix is to register the reset or inject the state —
   never to reorder tests or widen timeouts.
9. **Bridges and adapters.** Transition scaffolding is legitimate, but audit
   it: every adapter function must have a live call site (`rg` each export),
   and the file should shrink release over release, not grow.

Balance — restraint is part of the skill. Don't unify code that only looks
similar (two query builders with genuinely different shapes stay separate).
Don't break a repo-wide convention locally just because it repeats (the
per-handler try/catch shape in controllers is uniform across the codebase;
"fixing" one file creates inconsistency, not simplicity). When you decide
NOT to change something you inspected, say so in the report with the reason
— "considered, left alone because X" is as valuable as a diff.

## Before Making Changes

1. **Necessity**: does this change only address what's required?
2. **Existing abstractions**: search before adding new ones —
   - `packages/core/src/util`, `packages/core/src/validators` for logic or
     Zod schemas shared across web/backend
   - `packages/web/src/common/utils`, `packages/web/src/common/hooks` for
     web-only helpers
   - `packages/backend/src/common/util` for backend-only helpers
3. **Duplication**: does similar logic already exist in a sibling
   component/view/route?
4. **Root cause**: what is actually driving the complexity?

## Core Principles

### Minimal surface area

- Prefer the smallest change that achieves the goal
- Add abstractions only when reuse is real and obvious
- No "future-proofing" that adds complexity now for a hypothetical later

### DRY (without over-DRYing)

- Same logic in 2+ places → extract to the matching location above
- Similar structure with a small parameter surface → parameterize instead of
  copying
- Long `switch`/`if` chains on a key → a `Record` lookup, when handlers are
  simple
- Don't unify logic that only _looks_ similar — a shared abstraction must
  cleanly cover every real case, or it becomes the next bug

### Legibility

- One responsibility per function/component; keep React components in their
  own files (repo convention, no colocated multi-component files)
- Guard clauses and early returns over nested conditionals
- Functions under ~20 lines when feasible; flag anything over ~30
- No barrel files (`index.ts`/`index.tsx`) — import from the concrete source
  file, and remove a nearby barrel if it's safe to delete

### Extract vs. inline

**Extract** when logic is used in 2+ places, has a clear name, and a narrow,
stable API.

**Inline** when it's used once, the abstraction would need several optional
params, or the name would be vague (`handleThing`, `doStuff`).

### Minimize useEffect / useRef / useState

LLM-written React tends to reach for these three hooks by default, even when
the codebase already has a simpler answer. Treat every `useEffect`,
`useRef`, and `useState` in the diff as guilty until proven necessary, in
this order:

1. **Derive during render.** If a value can be computed from
   props/state/existing store data, compute it inline. Don't sync it into a
   `useState` via a `useEffect` — that's an extra render, an extra failure
   mode, and a stale-closure trap waiting to happen.
2. **Existing state layers.** Zustand stores (`xActions`/`selectX`
   convention) own shared/cross-component state; TanStack Query owns
   server/async state. Don't shadow either with local `useState` +
   `useEffect` that re-derives what the store or query already has.
3. **Web APIs directly.** Event listeners, `IntersectionObserver`,
   `ResizeObserver`, `matchMedia`, etc. can often replace a
   `useEffect`/`useState` pair when the component is really just reacting to
   a DOM/browser event, not React lifecycle.
4. **Refactor the boundary.** Sometimes the fix isn't a hook at all — lift
   state to the parent, colocate it differently, or split the component.

If, after checking the above, the hook is still the right tool (syncing with
a non-React system, an actual imperative DOM handle, true local UI-only
state that nothing else needs), keep it — but say why in the commit message
(see Commit below). Don't leave that justification implicit; "kept
`useEffect` for X because Y" is the bar.

## Repo-Specific Conventions

- Use path aliases, not deep relative imports: `@compass/core`,
  `@compass/backend`, `@compass/scripts`, `@web/*`, `@core/*`
- Shared web/backend contracts belong in `packages/core` and use Zod — match
  the existing import style in the file you're editing
- Zustand stores follow store + module actions + plain selectors (see
  [packages/web/src/events/stores/view.store.ts](../../../packages/web/src/events/stores/view.store.ts)):
  a plain `create()` store, an `xActions` object of `setState` calls, and
  standalone `selectX` functions — don't reach for Redux-style
  reducers/thunks or wrap actions in extra abstraction
- Web tests use React Testing Library with semantic role/name/text queries
  and `user-event` — simplifying a component shouldn't push tests toward CSS
  or `data-*` selectors
- New/changed web styles use Tailwind semantic colors from
  `packages/web/src/index.css`, not raw colors (`bg-blue-300`) or arbitrary
  values when a canonical scale utility exists
- Boolean names use an `is` prefix

## Nesting Reduction

**Preferred**:

```ts
if (!user?.isActive) return;
if (!user.hasPermission) return;
doThing();
```

**Avoid**:

```ts
if (user) {
  if (user.isActive) {
    if (user.hasPermission) {
      doThing();
    }
  }
}
```

## Config Over Conditionals

**Before**:

```ts
function getLabel(type: string) {
  if (type === "email") return "Email";
  if (type === "phone") return "Phone";
  return "Unknown";
}
```

**After**:

```ts
const LABELS: Record<string, string> = { email: "Email", phone: "Phone" };
const getLabel = (type: string) => LABELS[type] ?? "Unknown";
```

## Complexity Thresholds

| Metric               | Prefer     | Flag       | Action                        |
| -------------------- | ---------- | ---------- | ----------------------------- |
| Function length      | < 20 lines | > 30 lines | Split or extract              |
| Nesting depth        | ≤ 2 levels | > 3 levels | Guard clauses, early returns  |
| Parameters           | ≤ 3        | > 4        | Options object or context     |
| Conditional branches | ≤ 3        | > 4        | Record lookup or polymorphism |
| Similar blocks       | 0          | 2+         | Extract and parameterize      |

## Verify

Match the check to the packages actually touched — don't default to a broad
suite:

- `packages/core` changes → `bun run test:core`
- `packages/web` changes → `bun run test:web`
- `packages/backend` changes → `bun run test:backend`
- `packages/scripts` changes → `bun run test:scripts`
- Shared contracts or cross-package edits → the affected package tests plus
  `bun run type-check`
- `bun run verify` picks checks from the git diff automatically — good as a
  first pass, but confirm its output rather than treating it as sufficient
  on its own
- `bun run lint` (Biome) before handoff for any non-docs change

## Commit

Simplification must land as its own commit, separate from the commit(s) it
simplifies, so the diff history shows implementation → simplification as
distinct, reviewable steps.

- After verify passes, stage only the files touched during simplification
  and create a new commit — never `--amend` the implementation commit and
  never mix simplification into a commit that isn't already staged for it.
- Use a conventional commit message matching this repo's style (see
  `git log`), e.g. `refactor(web): simplify <what changed>`. Scope to the
  package touched (`core`/`web`/`backend`/`scripts`), same as existing
  commits.
- If the diff still contains a `useEffect`, `useRef`, or `useState` after
  applying the checks above (whether newly added or left in place), the
  commit body must justify each one in one line: `useEffect: <why>`. If none
  remain, no note is needed — don't pad the message.
- If simplification found nothing to change, skip the commit step entirely
  and say so — don't create an empty commit.
- Never push. Committing locally is the end of this skill's job.

## Output Format

1. One-sentence summary of the change
2. Minimal diff or before/after
3. Principle(s) applied
4. Any tradeoffs, and which verify command was run
5. React hook complexity: did `useEffect`/`useRef`/`useState` usage go down,
   stay flat, or go up, and — if any remain — the one-line justification for
   each from the commit body
6. The commit hash and message of the new simplification commit (or a note
   that no commit was needed)
