# Compass

## Defaults

- Frontend-only work usually starts with `bun run dev:web`; it does not require
  backend services.
- Backend, auth, MongoDB, Google sync, and SSE work require
  `packages/backend/.env.local`. Bootstrap with:

```bash
cp packages/backend/.env.local.example packages/backend/.env.local
```

- Avoid defaulting to `bun run test`; use the focused package test first.
- Formatting is handled by the repo-local Codex Stop hook after each agent turn.
- Use `bun run lint` and relevant verification before push or handoff.

## Commands

```bash
bun install
bun run dev:web
bun run dev:backend
bun run test:core
bun run test:web
bun run test:backend
bun run test:scripts
bun run type-check
bun run lint
bun run lint:fix
```

Validation defaults:

- Core: `bun run test:core`
- Web: `bun run test:web`
- Backend: `bun run test:backend`
- Scripts: `bun run test:scripts`
- Shared contracts/cross-package behavior: affected package tests plus
  `bun run type-check`

## Lookups

- Docs index: `docs/README.md`
- Edit-location map: `docs/development/feature-file-map.md`
- Common change paths: `docs/development/common-change-recipes.md`
- Testing details: `docs/development/testing-playbook.md`
- Local env/runtime modes: `docs/development/local-development.md`
- Troubleshooting: `docs/development/troubleshoot.md`
- Feature acceptance runbooks: `docs/acceptance/`
- Feature docs: `docs/features/`
- `docs/self-hosting.md`
- `self-host/README.md`

## Compass-Specific Rules

- Use aliases instead of deep relative imports:
  - `@compass/backend` -> `packages/backend/src`
  - `@compass/core` -> `packages/core/src`
  - `@compass/scripts` -> `packages/scripts/src`
  - `@web/*` -> `packages/web/src/*`
  - `@core/*` -> `packages/core/src/*`
- Shared web/backend contracts belong in `packages/core` and should use Zod.
- Web tests should use React Testing Library, semantic role/name/text queries,
  and `user-event`; avoid CSS selectors and `data-*` locators.
- New web styles should use Tailwind semantic colors from
  `packages/web/src/index.css`, not raw colors like `bg-blue-300`.
- Do not test login flows without the required backend setup.
- Keep React components in their own files.
- Do not add barrel `index.ts` files.
- Use `is` prefixes for boolean names.

## Git

- Branches: `type/action[-issue-number]`, for example `feature/add-form`.
- Commits: conventional, lower-case, present tense, for example
  `fix(web): handle disconnected google state`.
