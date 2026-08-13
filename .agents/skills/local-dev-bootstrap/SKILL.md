---
name: local-dev-bootstrap
description: Prepares the lightest viable Compass local development environment, choosing frontend-only or full backend/auth/Mongo/Google/SSE setup, protecting compass.yaml secrets, resolving worktree ports, and verifying service health. Use for first-time setup, local server startup, missing config, auth/backend development, or worktree port problems.
---

# Bootstrap Compass locally

Start only the services required by the task. Read `AGENTS.md` and
`docs/development/local-development.md` before changing local setup.

## 1. Choose the mode

### Frontend-only

Use for layout, routing, component behavior, keyboard/pointer interactions, and
many local-storage changes:

```bash
bun run dev:web
```

Do not start backend, MongoDB, or sync services by default.

### Full local stack

Use for authenticated APIs, Mongo persistence, Google OAuth/sync, SSE, user
profiles, or backend validation:

```bash
bun run dev:backend
bun run dev:sync
bun run dev:web
```

Start each long-running service once and reuse an existing healthy process.

## 2. Install dependencies

Run this unconditionally at the start of any session in a fresh worktree,
before running `type-check` or any `dev:*` command — do not wait for a
failure to prompt it:

```bash
bun install
```

Use the repository's pinned Bun/package configuration. Do not substitute npm,
yarn, or pnpm.

## 3. Protect configuration

Full-stack work requires `compass.yaml` at the repository root. If it is
missing:

```bash
cp compass.example.yaml compass.yaml
```

- `compass.yaml` is gitignored and contains secrets. Never print, stage, or
  commit its contents.
- Do not overwrite an existing file.
- Fill required local values through the user's normal secret source; do not
  invent credentials.
- Google remains disabled while client credentials are absent or placeholders.

In worktrees, `bun run dev:web` and `bun run dev:backend` execute
`bun run dev:ports`. It may copy the gitignored config from the main checkout
or allocate the next free web/backend port pair. Trust the served URL printed
by the current process rather than assuming `9080`/`3000`.

Once `mongo.uri` is present (the worktree can already run `dev:backend` for
the main app), `dev:ports` also fills in a missing `sync:` block on its own —
`internalAuthToken` is generated locally (it's a shared secret two
locally-run processes compare to themselves, never an external value),
`serviceUrl`/`callbackBaseUrl` are derived from an assigned local port, and
`mongoUri` is derived from `mongo.uri` itself (same host/credentials, an
isolated database name). Nothing needs to be fetched or invented by hand for
this case. If `dev:backend` still fails after that with a Zod error naming
`sync.*` fields, `mongo.uri` itself is likely absent or unrecognizable —
check that first rather than trying to hand-author the `sync:` block.

## 4. Verify health

Wait for actual startup output. For backend work, probe the configured port:

```bash
curl -i http://localhost:<PORT>/api/health
```

- `200` + `status: ok` — backend and Mongo are reachable
- `500` + `status: error` — backend is running; Mongo/config is unhealthy
- refused/timeout — wrong port or backend not listening

Open the printed web URL and check browser console/network output before
testing behavior.

## 5. Google and SSE boundaries

- Browser API/SSE traffic can stay on localhost.
- Google Calendar webhook notifications require a public HTTPS callback.
- Keep `backend.apiUrl` local for browser and SSE traffic.
- Set only `google.webhookUrl` to a temporary tunnel ending in `/api`.
- Stop temporary tunnels after testing and avoid sensitive personal calendars.
- Real Google sign-in requires a redirect URI registered for the chosen
  worktree port.

Do not test login, OAuth, watch notifications, or authenticated persistence
until these prerequisites are satisfied.

## Troubleshoot in order

1. `type-check`/`dev:*` failing with dozens of `Cannot find module` errors
   means dependencies were never installed, not a real regression — run
   `bun install` (step 2) and re-check before investigating further.
2. Confirm the current process and printed ports.
3. Confirm `compass.yaml` exists without revealing it.
4. Probe `/api/health`.
5. Confirm web `API_BASEURL` targets the current backend.
6. Distinguish OAuth redirect failures from webhook delivery failures.
7. Read `docs/development/troubleshoot.md` and the relevant feature flow.

Note for Claude Code sessions: this file is not invocable as a `/local-dev-bootstrap`
slash command — `.agents/skills/*` isn't registered with the Skill tool. Read
and follow this file directly instead of assuming the command exists.

## Report

State the selected mode, processes reused/started, effective URLs, health
result, and any manual prerequisite still required. Never include secret
values.
