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

Start from this baseline:

> Perform a deep code quality audit of the current branch's changes.
> Rethink how to structure / implement the changes to meaningfully improve code quality without impacting behavior.
> Work to improve abstractions, modularity, reduce Spaghetti code, improve succinctness and legibility.
> Be ambitious, if there is a clear path to improving the implementation that involves restructuring some of the codebase, go for it.
> Be extremely thorough and rigorous. Measure twice, cut once.

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

## Ambitious Simplification
   - Do not stop at "this could be a bit cleaner."
   - Look for opportunities to reframe the change so that whole branches, helpers, modes, conditionals, or layers disappear entirely.
   - Prefer the solution that makes the code feel inevitable in hindsight.
   - Assume there is often a "code judo" move available: a re-organization that uses the existing architecture more effectively and makes the change dramatically simpler and more elegant.
   - If you see a path to delete complexity rather than rearrange it, push hard for that path.
   - If behavior can stay the same while the structure becomes meaningfully cleaner, push for the cleaner version.
   - Do not rubber-stamp "it works" implementations that leave the codebase messier.
   - Strongly prefer simplifications that remove moving pieces altogether over refactors that merely spread the same complexity around.
  - Prefer direct, boring, maintainable code over hacky or magical code.**
    - Treat brittle, ad-hoc, or "magic" behavior as a code-quality problem.
    - Be skeptical of generic mechanisms that hide simple data-shape assumptions.
    - Flag thin abstractions, identity wrappers, or pass-through helpers that add indirection without buying clarity.

## Preferred Remedies

When you identify a code-quality problem, prefer suggestions like:

- Delete a whole layer of indirection rather than polishing it.
- Reframe the state model so conditionals disappear instead of getting centralized.
- Change the ownership boundary so the feature becomes a natural extension of an existing abstraction.
- Turn special-case logic into a simpler default flow with fewer exceptions.
- Extract a helper or pure function.
- Split a large file into smaller focused modules.
- Move feature-specific logic behind a dedicated abstraction.
- Replace condition chains with a typed model or explicit dispatcher.
- Separate orchestration from business logic.
- Collapse duplicate branches into a single clearer flow.
- Delete wrappers that do not meaningfully clarify the API.
- Reuse the existing canonical helper instead of introducing a near-duplicate.
- Make type boundaries more explicit so the control flow gets simpler.
- Move the logic to the package/module/layer that already owns the concept.
- Parallelize independent work when that also simplifies the orchestration.
- Restructure related updates into a more atomic flow when partial state would be harder to reason about.

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

## Primary Review Questions

For every meaningful change, ask:

- Is there a "code judo" move that would make this dramatically simpler?
- Can this change be reframed so fewer concepts, branches, or helper layers are needed?
- Does this improve or worsen the local architecture?
- Did the diff add branching complexity where a better abstraction should exist?
- Did a previously cohesive module become more coupled, more stateful, or harder to scan?
- Is this logic living in the right file and layer?
- Did this change enlarge a file or component past a healthy size boundary?
- Are there repeated conditionals that signal a missing model or missing helper?
- Is the implementation direct and legible, or does it rely on special cases and incidental control flow?
- Is this abstraction actually earning its keep, or is it just a wrapper?
- Did the diff introduce casts, optionality, or ad-hoc object shapes that obscure the real invariant?
- Is this logic living in the canonical layer, or did the diff leak details across a boundary?
- Is this orchestration more sequential or less atomic than it needs to be?


## Additional Resources

- For detailed heuristics and decision rules, see [heuristics.md](heuristics.md)
- For before/after patterns, see [examples.md](examples.md)
