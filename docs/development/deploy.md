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
bun run cli build web --environment staging --clientId "test-client-id"
```

Webpack outputs static assets to `build/web`. Serve those assets from any static host or reverse proxy setup that can serve the app and `version.json`.

## Backend (API)

Build command:

```bash
bun run cli build nodePckgs --environment staging
```

Node build output lands in `build/node` and includes a copied `.env` file for the selected environment when that file exists.

What this build command does:

- compiles backend/core with `bunx tsc --project tsconfig.build.json`
- copies root + package manifests (`package.json`, `bun.lock`, package-level `package.json` files)
- installs production dependencies in `build/node` with:
  `bun install --production --frozen-lockfile --ignore-scripts --no-progress`

Runtime entrypoint:

```bash
cd build/node
node packages/backend/src/app.js
```

Runtime notes:

- Bun is the build orchestrator, but deployed backend runtime is still Node.
- Compiled runtime alias wiring is initialized in `packages/backend/src/init.ts` for build output paths (`/build/...`) so imports like `@backend/*` and `@core/*` continue to resolve.

Deployment notes:

- backend requires MongoDB, SuperTokens, and Google credentials
- if you run behind a reverse proxy, configure buffering/timeouts for long-lived `text/event-stream` responses (SSE)
- ngrok is only relevant for local watch/debug flows, not normal hosted deploys
