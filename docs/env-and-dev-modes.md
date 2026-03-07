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

Important variables:

- `API_BASEURL`
- `GOOGLE_CLIENT_ID`
- `NODE_ENV`
- `POSTHOG_KEY`
- `POSTHOG_HOST`

`BACKEND_BASEURL` is derived from `API_BASEURL`.

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
