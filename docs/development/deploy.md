# Deploy

Compass deploys as a web frontend plus a Bun-runtime backend.

## Runtime Requirements

To support Google sign-in and sync in non-local environments, you need:

- an HTTPS-accessible web origin
- an HTTPS-accessible API origin
- matching Google OAuth redirect/origin configuration
- backend env files for the target environment

For staging or production:

1. Put runtime values in `packages/backend/.env.staging` or `packages/backend/.env.production`.
2. Set `FRONTEND_URL` to the public web app URL.
3. Set `BASEURL` to the public API base URL, including `/api`.
4. Set `CORS` to the comma-separated list of allowed origins for the backend.
5. Ensure Google Cloud OAuth settings include the deployed web origin and redirect URIs.

## Web

Build command:

```bash
BUILD_ENV=staging bun run build:web
```

Bun outputs static assets to `build/web`. Serve those assets from any static host or reverse proxy setup that can serve the app and `version.json`.

## Backend (API)

Build command:

```bash
BUILD_ENV=staging bun run build:backend
```

Backend build output lands in `build/backend` and includes a copied `.env` file for the selected environment when that file exists.

Runtime entrypoint:

```bash
bun build/backend/app.js
```

Deployment notes:

- backend requires MongoDB, SuperTokens, and Google credentials
- if you run behind a reverse proxy, configure buffering/timeouts for long-lived `text/event-stream` responses (SSE)
- ngrok is only relevant for local watch/debug flows, not normal hosted deploys
