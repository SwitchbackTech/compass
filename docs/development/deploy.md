# Deploy

Compass deploys as a web frontend plus a Node backend.

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
bun run build:web
```

Bun bundles static assets to `build/web`. Serve those assets from any static host or reverse proxy setup that can serve the app and `version.json`.

## Backend (API)

Build command:

```bash
bun run build:backend --environment staging
```

The backend build uses `Bun.build()` to produce a single bundled file at `build/backend/app.js`,
alongside a `.env` file copied from the selected environment and a minimal `node_modules/`
containing only required native modules such as `saslprep`.

Runtime entrypoint:

```bash
cd build/backend && bun app.js
```

Bun loads `.env` from the working directory, so `cd` into the build dir before running.

Deployment notes:

- backend requires MongoDB and SuperTokens; Google credentials are optional and only needed for Google auth and Google Calendar sync
- if you run behind a reverse proxy, configure buffering/timeouts for long-lived `text/event-stream` responses (SSE)
- Google Calendar webhook notifications require `BASEURL` to be a public HTTPS API URL
