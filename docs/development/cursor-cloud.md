# Cursor Cloud environment

How a Cursor Cloud VM runs this repo. Everything here is derived from
`.cursor/environment.json` and `.cursor/bootstrap-backend.sh`; read those when
in doubt. General rules live in `AGENTS.md`.

Bun (`bun@1.3.14`) is the runtime and package manager. The environment is
defined in `.cursor/environment.json`: its `install` step installs Bun (fresh
VMs do not ship it) and runs `bun install`, so Bun is guaranteed on boot. The
VM's system `node` may be older than the `engines` field asks for, but
everything runs through Bun, so that mismatch is not a blocker.

- `compass.yaml` at the repo root is required for `dev:web`, `dev:backend`, and
  `cli` — even frontend-only `dev:web` aborts if the config still contains
  placeholders. The validator (`packages/core/src/config/compass.config.ts`)
  rejects any string containing `REPLACE_WITH_` (comments are ignored). This
  file is gitignored and holds secrets — never commit it.
- Web: `bun run dev:web` serves http://localhost:9080 and works fully in the
  anonymous / IndexedDB mode with no backend (create/edit events, shortcuts,
  etc.), which is the quickest way to exercise core functionality. For
  frontend-only work, `cp compass.example.yaml compass.yaml` and replace the
  placeholders with any dummy non-placeholder strings.
- Tests need no external services — the DB-backed suites (`test:backend`,
  `test:sync`, `test:scripts`) spin up an in-memory MongoDB automatically, and
  SuperTokens/Google are mocked. Run the focused suite per AGENTS.md
  (`bun test:core|web|backend|sync|scripts`).
- Playwright e2e/a11y (`bun test:e2e`, `bun test:a11y`) are self-contained —
  they boot their own web server on port 9150 with `e2e/compass.playwright.yaml`
  (no real backend), but require the browser first: `bunx playwright install
  chromium`. Axe "incomplete" results are logged, not failures (see
  `docs/development/testing-playbook.md`).
- Backend: run `bash .cursor/bootstrap-backend.sh` once to write a working
  `compass.yaml` and install/start a single-node MongoDB replica set, then
  `bun run dev:backend` (serves http://localhost:3000/api). The script is
  idempotent and reads `SUPERTOKENS_URI`, `SUPERTOKENS_KEY`, `GOOGLE_CLIENT_ID`,
  `GOOGLE_CLIENT_SECRET`, `SYNC_MONGO_URI`, and `SYNC_INTERNAL_AUTH_TOKEN` from
  the environment when set (otherwise dummy local values, Google disabled). The
  required `sync.*` config block is filled with local defaults — `sync.mongoUri`
  points at an isolated `compass_sync` database on the same local replica set.
  Non-obvious: the backend uses transactions, so Mongo must be a replica set and
  both `mongo.uri` and `sync.mongoUri` must include `replicaSet=...` — a
  standalone `mongod` will not work. `GET /api/health` returning
  `200 {"status":"ok"}` confirms the backend is up and Mongo is reachable.
- The Sync service (`bun run dev:sync`) is a separate, optional process. When it
  is not running, the backend logs recurring
  `app:sse.sync-change-feed: Sync global change-feed poll failed: unavailable`
  warnings — these are expected and harmless for core event CRUD work; only start
  `dev:sync` when working on Google sync/SSE.
- Auth/login and real Google Calendar sync are gated on external services not
  provisioned by default: a SuperTokens instance and Google OAuth. Provide them
  as environment secrets so `bootstrap-backend.sh` wires them into
  `compass.yaml`. Without them the backend still runs and serves
  anonymous/health traffic, but do not attempt login flows (see the AGENTS.md
  rule) until those are configured.
