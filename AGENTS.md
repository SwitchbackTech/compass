# Compass

## Defaults

- Frontend-only work usually starts with `bun dev:web`; it does not require
  backend services.
- Backend, auth, MongoDB, Google sync, and SSE work require
  a `compass.yaml` at the repo root. Bootstrap with:

```bash
cp compass.example.yaml compass.yaml
```

- `compass.yaml` contains secrets. Do not commit it.

- Avoid defaulting to `bun test`; use the focused package test first.
- Formatting is handled by the repo-local Codex Stop hook after each agent turn.
- Use `bun lint` and relevant verification before push or handoff.

## Commands

```bash
bun install
bun dev:web
bun dev:backend
bun test:core
bun test:web
bun test:backend
bun test:scripts
bun type-check
bun lint
bun lint:fix
```

Validation defaults:

- Core: `bun test:core`
- Web: `bun test:web`
- Backend: `bun test:backend`
- Scripts: `bun test:scripts`
- Shared contracts/cross-package behavior: affected package tests plus
  `bun type-check`
- Keep regression tests that protect real behavior. Remove temporary tests,
  scripts, debug hooks, or code added only to confirm a one-time hypothesis once
  that verification is complete.

## Lookups

- Domain context: `CONTEXT.md`
- Docs index: `docs/README.md`
- Edit-location map: `docs/development/feature-file-map.md`
- Common change paths: `docs/development/common-change-recipes.md`
- Testing details: `docs/development/testing-playbook.md`
- Local env/runtime modes: `docs/development/local-development.md`
- Troubleshooting: `docs/development/troubleshoot.md`
- Feature acceptance runbooks: `docs/acceptance/`
- Feature docs: `docs/features/`
- `docs/self-hosting/README.md`
- `self-host/README.md`

## Agent skills

### Issue tracker

Issues and PRDs are tracked in GitHub Issues for `SwitchbackTech/compass`. See
`.agents/config/issue-tracker.md`.

### Triage labels

Use the default triage label vocabulary. See
`.agents/config/triage-labels.md`.

### Domain docs

Use a single-context domain-doc layout. See `.agents/config/domain.md`.

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
- Prefer canonical Tailwind scale utilities over arbitrary values when an
  equivalent exists. Treat VS Code Tailwind IntelliSense
  `suggestCanonicalClasses` warnings as actionable cleanup before finishing
  changes.
- Do not test login flows without the required backend setup.
- Keep React components in their own files.
- Do not add or use barrel files such as `index.ts` / `index.tsx`. Import from
  the concrete source file instead, and remove nearby barrel files when it is
  safe to do so.
- Use `is` prefixes for boolean names.

## Git

- Branches: `type/action[-issue-number]`, for example `feature/add-form`.
- Commits: conventional, lower-case, present tense, for example
  `fix(web): handle disconnected google state`.
