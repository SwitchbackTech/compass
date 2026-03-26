# Coding Conventions

Use [AGENTS.md](../../AGENTS.md) as the normative source for repo-wide coding rules, branch naming, commit format, testing defaults, and workflow expectations.

This document keeps only the local conventions that are useful to repeat inside `docs/`.

## Commits And PRs

- Use conventional commits in lower-case.
- Do not use emoji prefixes in commit messages.
- Keep branch naming and commit formatting aligned with `AGENTS.md`.

## Comments

- Do not use code comments as task tracking. Open an issue instead.
- Prefer self-explanatory code and tests over explanatory comments.
- Add comments only when they explain non-obvious behavior, constraints, or cross-file coupling.
- If a flow needs more than a short code comment, prefer a repo doc and link to it.

## Cleanup

- Do not add dead code, speculative scaffolding, or half-implemented branches.
- If you find unused code that is clearly unrelated to your main change, remove it separately when practical.
- Leave touched code a little clearer than you found it: simpler control flow, better naming, or better tests.

## Shared Contracts

- Prefer shared Zod-backed contracts in `packages/core` when web and backend both depend on them.
- Use module aliases instead of deep relative imports.
- Follow the established pattern of the area you are editing instead of forcing large stylistic migrations during unrelated work.
