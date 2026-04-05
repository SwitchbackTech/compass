# Compass Calendar — Claude Code Instructions

Compass is a React/TypeScript monorepo with four packages: `web` (React frontend), `backend` (Express + MongoDB), `core` (shared types/utils), `scripts` (CLI + build tools). Managed with Bun. Read [AGENTS.md](./AGENTS.md) for the authoritative rules. Read [docs/development/agent-onboarding.md](./docs/development/agent-onboarding.md) for the recommended reading order.

## Verify Commands

Run after making changes. Always run `bun run type-check` before handoff.

| Changed package              | Command                                                                               |
| ---------------------------- | ------------------------------------------------------------------------------------- |
| `packages/core` only         | `bun run test:core && bun run type-check`                                             |
| `packages/web` only          | `bun run test:web`                                                                    |
| `packages/backend` only      | `bun run test:backend`                                                                |
| `packages/scripts` only      | `bun run test:scripts`                                                                |
| Cross-package (types/schema) | `bun run test:core && bun run test:web && bun run test:backend && bun run type-check` |
| Lint changed files           | `./node_modules/.bin/eslint <file1> <file2>`                                          |

Or use the smart detect-and-run script: **`bun run verify`** (checks git diff, runs the right suites + type-check).

Timing: `test:core` ~2s, `test:web` ~15s, `test:backend` ~15s, `type-check` ~3s.

## Module Aliases

Use these — never relative paths:

- `@compass/backend`, `@compass/core`, `@compass/scripts` → for non-web packages (root `_moduleAliases`)
- `@web/*` → `packages/web/src/*`
- `@core/*` → `packages/core/src/*`

## AI Pitfalls

Things that are easy to get wrong in this codebase:

1. **Never run `bun run test` bare** — in restricted environments it tries to download MongoDB binaries and hangs. Always use `test:core`, `test:web`, `test:backend`, or `test:scripts`.

2. **The 4-layer web state is intentional** — Redux slices + redux-saga + Elf store + IndexedDB are not an inconsistency to fix. See [web-state-guide.md](./docs/development/web-state-guide.md) for when each layer is used.

3. **Never create barrel (`index.ts`) files** — explicitly prohibited. Use direct named imports.

4. **Tailwind semantic tokens only** — never `bg-blue-300` or `text-gray-100`. Use `bg-bg-primary`, `text-text-light`, etc. Tokens are defined in `packages/web/src/index.css`.

5. **File naming uses periods** — `compass.event.parser.ts`, not `compassEventParser.ts`. Hooks are camelCase: `useGoogleAuth.ts`.

6. **Never use `mongoService` directly in tests** — use test drivers: `packages/backend/src/__tests__/drivers/` (`UserDriver`, `WatchDriver`, etc.).

7. **Core type changes need all three suites** — any change to `packages/core/src/types` requires `test:core && test:web && test:backend && type-check`.

8. **Repository selection prefers remote once authenticated** — once a user has logged in, event reads go remote unless Google is in an explicitly revoked state. Entry point: `packages/web/src/common/repositories/event/event.repository.util.ts`.

9. **IndexedDB initializes before Redux boots** — in production, storage init happens in `packages/web/src/index.tsx` before Redux starts. In tests, `fake-indexeddb/auto` handles it automatically.

10. **Zod imports vary by file** — the repo uses `zod`, `zod/v4`, and `zod/v4-mini`. Match the import style of the file you are editing.

## Web State Management (Quick Reference)

The web package has four intentional layers:

| Concern                                          | Mechanism                     | Key File                                                       |
| ------------------------------------------------ | ----------------------------- | -------------------------------------------------------------- |
| App/async UI state (loading, modals)             | Redux Toolkit slices          | `packages/web/src/ducks/`                                      |
| Async side effects (fetch, persist, sequences)   | redux-saga                    | `packages/web/src/ducks/events/sagas/event.sagas.ts`           |
| Event entity state (create/update/delete/select) | Elf store                     | `packages/web/src/store/events.ts`                             |
| Offline persistence (events, tasks)              | IndexedDB via adapter         | `packages/web/src/common/storage/adapter/indexeddb.adapter.ts` |
| Session/auth                                     | SuperTokens + SessionProvider | `packages/web/src/auth/session/SessionProvider.tsx`            |

Full guide: [docs/development/web-state-guide.md](./docs/development/web-state-guide.md)

## Docs Map

| Question                                     | Read                                                                                     |
| -------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Where do I edit X?                           | [docs/development/feature-file-map.md](./docs/development/feature-file-map.md)           |
| How do I safely implement Y?                 | [docs/development/common-change-recipes.md](./docs/development/common-change-recipes.md) |
| How do I write tests?                        | [docs/development/testing-playbook.md](./docs/development/testing-playbook.md)           |
| How does the package structure work?         | [docs/architecture/repo-architecture.md](./docs/architecture/repo-architecture.md)       |
| What are the requirements for feature Z?     | `docs/requirements/<feature>.md`                                                         |
| How does Google sync / offline storage work? | `docs/features/`                                                                         |
