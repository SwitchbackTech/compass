# Compass Claude Notes

Keep this file light. It is the Claude-specific startup map, not the full
manual.

Read [AGENTS.md](./AGENTS.md) first for the shared repo rules and
[docs/README.md](./docs/README.md) for the docs index.

## Claude-Specific Defaults

- Prefer focused checks over broad suites. Avoid bare `bun run test`.
- For changed package validation, start from the matching package command:
  `bun run test:core`, `bun run test:web`, `bun run test:backend`, or
  `bun run test:scripts`.
- Use `bun run verify` when you want the repo helper to choose checks from the
  git diff, but confirm its output before treating the task as done.
- Use `bun run lint` before push or handoff when the work is not docs-only.

## Easy Misses

- The web state layers are intentional: Redux slices/listeners, TanStack Query, and
  IndexedDB each have a role. See
  [docs/frontend/frontend-runtime-flow.md](./docs/frontend/frontend-runtime-flow.md).
- Repository selection prefers remote event storage once a user has
  authenticated, unless Google is explicitly revoked.
- Core type/schema changes usually need core, web, backend, and type-check
  coverage.
- Match the local Zod import style in the file you are editing.

## Lookups

- Edit-location map: [docs/development/feature-file-map.md](./docs/development/feature-file-map.md)
- Change recipes: [docs/development/common-change-recipes.md](./docs/development/common-change-recipes.md)
- Testing playbook: [docs/development/testing-playbook.md](./docs/development/testing-playbook.md)
- Package structure: [docs/architecture/repo-architecture.md](./docs/architecture/repo-architecture.md)
- Feature acceptance: `docs/acceptance/`
- Feature docs: `docs/features/`
