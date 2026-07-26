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
- Formatting is handled by repo-local Codex and Cursor hooks after agent edits.
- Use `bun lint` and relevant verification before pushing or ending a session.

## Commands

```bash
bun install
bun dev:web
bun dev:backend
bun dev:sync
bun test:core
bun test:sync
bun test:web
bun test:backend
bun test:scripts
bun type-check
bun lint
bun lint:fix
```

Validation defaults:

- Core: `bun test:core`
- Sync: `bun test:sync`
- Web: `bun test:web`
- Backend: `bun test:backend`
- Scripts: `bun test:scripts`
- Shared contracts/cross-package behavior: affected package tests plus
  `bun type-check`
- Keep regression tests that protect real behavior. Remove temporary tests,
  scripts, debug hooks, or code added only to confirm a one-time hypothesis once
  that verification is complete.
- Use `bun run verify` when you want the repo helper to choose checks from the
  git diff, but confirm its output before treating the task as done.
- Use `bun run lint` before pushing when the work is not docs-only.

## Lookups

- Docs index: `docs/README.md`

## Skills

Project workflows live in `.agents/skills` so supported agents share one source
of truth:

- `/ship`: validate, review, open, merge, and verify a delivery
- `/simplify`: reduce complexity without changing behavior
- `/a11y-audit`: review changed UI for accessibility regressions
- `/qa-test-staging`: run the post-deploy staging confidence sweep
- `/verify-change`: select and run checks from the actual diff
- `/local-dev-bootstrap`: prepare the lightest viable local environment
- `/google-sync-debug`: trace OAuth, provider, job, webhook, and SSE failures
- `/handoff`: compact work for a fresh agent session

## Compass-Specific Rules

- Use aliases instead of deep relative imports:
  - `@compass/backend` -> `packages/backend/src`
  - `@compass/core` -> `packages/core/src`
  - `@compass/scripts` -> `packages/scripts/src`
  - `@compass/sync` -> `packages/sync/src`
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

## Git

- Branches: `type/action[-issue-number]`, for example `feature/add-form`.
- Commits: conventional, lower-case, present tense, for example
  `fix(web): handle disconnected google state`.

## Cursor Cloud specific instructions

Bun (`bun@1.3.14`) is the runtime and package manager; the startup update
script runs `bun install`. The VM's system `node` may be older than the
`engines` field asks for, but everything runs through Bun, so that mismatch is
not a blocker.

- `compass.yaml` at the repo root is required for `dev:web`, `dev:backend`, and
  `cli` — even frontend-only `dev:web` aborts if the config still contains
  placeholders. Bootstrap with `cp compass.example.yaml compass.yaml`, then
  replace every value: the validator (`packages/core/src/config/compass.config.ts`)
  rejects any string containing `REPLACE_WITH_`. For frontend/anonymous work,
  dummy local values (any non-placeholder strings) are fine. This file is
  gitignored and holds secrets — never commit it.
- Web: `bun run dev:web` serves http://localhost:9080 and works fully in the
  anonymous / IndexedDB mode with no backend (create/edit events, shortcuts,
  etc.), which is the quickest way to exercise core functionality.
- Tests need no external services — the DB-backed suites (`test:backend`,
  `test:sync`, `test:scripts`) spin up an in-memory MongoDB automatically, and
  SuperTokens/Google are mocked. Run the focused suite per AGENTS.md
  (`bun test:core|web|backend|sync|scripts`).
- Backend: `bun run dev:backend` serves http://localhost:3000/api and needs a
  reachable MongoDB. Because the backend uses transactions, Mongo must be a
  replica set and `mongo.uri` must include `replicaSet=...` — a standalone
  `mongod` will not work. Locally: install `mongodb-org`, run
  `mongod --dbpath /data/db --replSet rs0`, then `mongosh --eval
  'rs.initiate()'` once. `GET /api/health` returning `200 {"status":"ok"}`
  confirms the backend is up and Mongo is reachable.
- Auth/login and real Google Calendar sync are gated on external services not
  provisioned by default: a SuperTokens instance (`supertokens.uri`/`key`) and
  Google OAuth (`google.clientId`/`clientSecret`). Without them the backend
  still runs and serves anonymous/health traffic, but do not attempt login
  flows (see the AGENTS.md rule) until those are configured.
