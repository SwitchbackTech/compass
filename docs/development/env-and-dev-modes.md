# Env And Dev Modes

Compass has multiple workable development modes. Pick the lightest mode that supports the feature you are changing.

## Frontend-Only Mode

Command:

```bash
bun run dev:web
```

Use this for:

- most layout and interaction work
- local task behavior
- many event UI changes
- router and view work

You do not need the backend for basic frontend rendering.

## Backend Mode

Command:

```bash
bun run dev:backend
```

Use this for:

- authenticated API work
- Google OAuth/session behavior
- Mongo-backed event behavior
- sync and SSE work

This requires valid env config.

Bootstrap once from repo root:

```bash
cp packages/backend/.env.local.example packages/backend/.env.local
```

Runtime note:

- `bun run dev:backend`, `bun run dev:web`, and `bun run cli ...` load variables from `packages/backend/.env.local` via Node's `--env-file`.

## Backend Environment Contract

Source:

- `packages/backend/src/common/constants/env.constants.ts`

The backend validates env at startup with Zod.

Important variables:

- `NODE_ENV`
- `TZ`
- `BASEURL`
- `PORT`
- `MONGO_URI`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `SUPERTOKENS_URI`
- `SUPERTOKENS_KEY`
- `TOKEN_GCAL_NOTIFICATION`
- `TOKEN_COMPASS_SYNC`
- `FRONTEND_URL`
- `CORS` (parsed into `ENV.ORIGINS_ALLOWED`)

Optional but behavior-changing:

- `NGROK_AUTHTOKEN`
- `NGROK_DOMAIN`
- `EMAILER_API_SECRET`
- `EMAILER_USER_TAG_ID`

Derived backend values:

- `DB` is not supplied directly; backend derives it from `NODE_ENV`
- `ORIGINS_ALLOWED` is derived by splitting the comma-separated `CORS` env var

## CLI And Build URL Variables

Primary files:

- `packages/scripts/src/common/cli.constants.ts`
- `packages/scripts/src/common/cli.utils.ts`
- `packages/web/webpack.config.mjs`

Variables used by CLI/build flows:

- `BASEURL` (used for local CLI operations and injected into the web build as `API_BASEURL`)
- `FRONTEND_URL` (used by backend auth email flows and CLI domain resolution)

If `FRONTEND_URL` points to localhost, the CLI prompts for a VM/public domain and builds the API URL from that input.

## Web Environment Contract

Source:

- `packages/web/src/common/constants/env.constants.ts`

Important variables:

- `API_BASEURL`
- `GOOGLE_CLIENT_ID`
- `NODE_ENV`
- `POSTHOG_KEY`
- `POSTHOG_HOST`

`BACKEND_BASEURL` is derived from `API_BASEURL`.

Webpack behavior (`packages/web/webpack.config.mjs`):

- local/staging/production builds load `packages/backend/.env.local`, `.env.staging`, or `.env.production`
- missing env files are a warning, not a hard failure; values can come from `process.env`
- test mode skips env-file loading entirely

## Practical Mode Matrix

### Safe without backend

- route changes
- component rendering
- keyboard and pointer interactions
- local storage behavior
- many task workflows

### Requires backend

- user profile loading
- authenticated event APIs
- Google connection flows
- backend validation behavior
- Mongo persistence
- SSE stream behavior

## Backend Health Probe

When debugging backend startup or connectivity issues, use the health endpoint first:

```bash
curl -i http://localhost:<PORT>/api/health
```

Interpretation:

- `200` with `{"status":"ok","timestamp":"..."}`: backend is running and can reach MongoDB
- `500` with `{"status":"error","timestamp":"..."}`: backend is running but database connectivity failed
- connection refused/timeouts: backend process is not listening yet, or the port/base URL is wrong

### Requires Google-related setup

- real OAuth
- real Google Calendar import/sync
- notification watch flows

## Auth And Anonymous Behavior

Compass supports both:

- never-authenticated users using local storage
- authenticated or previously-authenticated users using remote repositories

When testing changes around event loading, explicitly decide which user state you are modeling.

## Ngrok Notes

Ngrok is optional for general local development but relevant for Google notification/watch flows. The backend env schema requires both ngrok auth token and static domain together if ngrok is enabled.

## Common Failure Modes

- backend exits immediately because required env is missing
- backend/web/cli read from `.env.local`; using `.env` instead leaves required variables unset
- web points at the wrong API base URL
- session exists but user profile fetch fails
- sync endpoints work but notification/watch setup fails due to incomplete Google/ngrok setup
- backend starts but `/api/health` returns `500` because `MONGO_URI` or database reachability is broken
