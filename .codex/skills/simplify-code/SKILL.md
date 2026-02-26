---
name: codex-simplify-code
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

## Additional Resources

- For detailed heuristics and decision rules, see [heuristics.md](heuristics.md)
- For before/after patterns, see [examples.md](examples.md)
