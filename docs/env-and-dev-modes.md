# Env And Dev Modes

Compass has multiple workable development modes. Pick the lightest mode that supports the feature you are changing.

## Frontend-Only Mode

Command:

```bash
yarn dev:web
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
yarn dev:backend
```

The backend dev script loads env from `packages/backend/.env.local` (`node --env-file=.env.local ...`).
Create it from the example before starting backend work:

```bash
cp packages/backend/.env.local.example packages/backend/.env.local
```

Use this for:

- authenticated API work
- Google OAuth/session behavior
- Mongo-backed event behavior
- sync and websocket work

This requires valid env config.

## Backend Environment Contract

Source:

- `packages/backend/src/common/constants/env.constants.ts`

The backend validates required env at startup with Zod.

Important variables:

- `NODE_ENV`
- `TZ`
- `BASEURL`
- `PORT`
- `MONGO_URI`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `LOCAL_WEB_URL` (used for app reset-password links)
- `SUPERTOKENS_URI`
- `SUPERTOKENS_KEY`
- `TOKEN_GCAL_NOTIFICATION`
- `TOKEN_COMPASS_SYNC`

Optional but behavior-changing:

- `NGROK_AUTHTOKEN`
- `NGROK_DOMAIN`
- emailer-related variables

## Web Environment Contract

Source:

- `packages/web/src/common/constants/env.constants.ts`
- `packages/web/webpack.config.mjs`

Important variables:

- `API_BASEURL`
- `GOOGLE_CLIENT_ID`
- `NODE_ENV`
- `POSTHOG_KEY`
- `POSTHOG_HOST`

`BACKEND_BASEURL` is derived from `API_BASEURL`.

Practical note:

- in local dev, `yarn dev:web` runs webpack with `--env-file=../backend/.env.local`
- webpack also has fallback env-file loading (`.env.local`, `.env.staging`, `.env.production`) relative to `packages/backend`
- if a mapped env file is missing, webpack warns and continues with `process.env`

## CLI Environment URL Contract

Source:

- `packages/scripts/src/common/cli.constants.ts`
- `packages/scripts/src/commands/delete.ts`

Variables used by scripts:

- `LOCAL_WEB_URL` (default cleanup target in local mode)
- `STAGING_WEB_URL` (required for `NODE_ENV=staging` cleanup/delete flows)
- `PROD_WEB_URL` (required for `NODE_ENV=production` cleanup/delete flows)

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
- websocket server behavior

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

## Repo-Local Yarn Cache

Files:

- `.yarnrc`
- `.gitignore`

Yarn is configured to use a repo-local cache folder:

```text
--cache-folder .yarn-cache
```

This keeps cache writes inside the workspace (instead of relying on a user-level global cache path) and reduces cache-permission noise in CI/sandboxed environments. The cache directory is ignored by git.

## Common Failure Modes

- backend exits immediately because required env is missing
- web points at the wrong API base URL
- session exists but user profile fetch fails
- sync endpoints work but notification/watch setup fails due to incomplete Google/ngrok setup
- backend starts but `/api/health` returns `500` because `MONGO_URI` or database reachability is broken
