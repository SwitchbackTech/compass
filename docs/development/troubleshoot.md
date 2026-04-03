# Troubleshoot

## Backend Health Check

Before debugging a deeper auth or sync issue, confirm the backend is actually up:

```bash
curl -i http://localhost:3000/api/health
```

Interpret the result like this:

- `200`: the backend is running and can reach MongoDB
- `500`: the backend is running but database connectivity failed
- connection refused or timeout: the backend is not listening yet, or the port/base URL is wrong

## Bun Install Fails With Lockfile Errors

If CI or local setup fails during dependency install with lockfile mismatch output, check whether dependency metadata changed without a matching `bun.lock` update.

Why this happens:

- unit/e2e workflows run `bun install --frozen-lockfile`
- `--frozen-lockfile` rejects installs when `package.json` and `bun.lock` are out of sync

Runbook:

1. regenerate lockfile from repo root:
   ```bash
   bun install
   ```
2. ensure the lockfile delta is present:
   ```bash
   git status --short
   ```
3. verify frozen-lockfile behavior locally:
   ```bash
   bun install --frozen-lockfile
   ```
4. commit both dependency manifest changes and `bun.lock` together

## E2E Fails Because Playwright Browsers Are Missing

If `bun run test:e2e` fails with browser executable errors, install browsers with the same command used in CI:

```bash
bunx playwright install --with-deps chromium
```

## SSE Stream Not Connected Or Not Receiving Events

Compass realtime updates now use Server-Sent Events over:

- `GET /api/events/stream`

If UI data is stale after backend writes or sync activity, verify transport before
digging into business logic.

Quick checks:

1. confirm session exists (browser has valid SuperTokens session cookie)
2. open browser Network tab and verify `/api/events/stream` stays open with `200`
3. verify response headers include `content-type: text/event-stream`
4. confirm periodic `: keepalive` frames are visible (roughly every 25 seconds)
5. trigger a known publish path (for example event write or import) and verify
   named events appear (`EVENT_CHANGED`, `IMPORT_GCAL_*`, `USER_METADATA`)

If the stream does not open:

- check auth first (`verifySession()` guards the stream route)
- verify backend route registration for `EventsRoutes`
- confirm `ENV_WEB.BACKEND_BASEURL` points to the same backend origin expected by the session cookie

If the stream opens but no events arrive:

- check backend logs for publish call sites (`sseServer.handle...`)
- verify user-id correlation (events fan out by authenticated user id)
- check reverse-proxy buffering behavior; backend sets `X-Accel-Buffering: no` and uses heartbeats to reduce buffering delays

## Unable to Sign In with Google in Local Compass Instance

### Missing User id

When you encounter a missing user id, Compass usually is not connected to MongoDB or the backend never started cleanly.

Sometimes MongoDB is successfully connected when you run `bun run dev:backend` but you still get a missing user id error. This could be because:

1. The MongoDB connection string in your backend env file is incorrect
2. Your IP address is not whitelisted in MongoDB Atlas
3. The MongoDB connection string format is invalid or incomplete
4. A required backend env variable is missing, so the server exited during startup

### Mismatch User Id

When you encounter a mismatch user id, the user in your mongo collection is not the one being captured. This could be because you have duplicate users in your database. In order to fix this you need to clear your user data using the CLI delete command:

```bash
bun run cli delete -u <email>
```

The delete flow removes both Compass data and SuperTokens auth state. The
browser cleanup screen only clears local browser storage after the server-side
purge is complete.

See [CLI And Maintenance Commands](./cli-and-maintenance-commands.md) for the current delete flow.

### Invalid domain name

When encountering an invalid domain name error, this is because the URL you provided in the `SUPERTOKENS_..` value in your active environment file is incorrect. For local development that is usually `.env.local`. This could be caused by prematurely finishing the setup of your Supertokens instance.

To fix this:

1. Make sure to completely set up your Supertokens instance
2. Copy the exact connection URI and API key from your Supertokens dashboard
3. Verify the connection URI format matches what Supertokens provides (should include the protocol, domain, and port if applicable)
4. Ensure there are no extra spaces or characters in the environment variable values

## Google Calendar Repair Fails Or Stops Unexpectedly

When a user triggers repair from the UI (`Repair Google Calendar`) and the flow
does not complete as expected, first classify the failure mode from the message
and SSE behavior.

### Quota / rate-limit during repair

If the user sees:

- `Google Calendar repair hit a Google API limit. Please wait a few minutes and try again.`

then backend detected a Google quota/rate-limit response (`403`/`429`), and this
is usually transient.

Recommended action:

1. wait a few minutes
2. retry repair
3. if this repeats across many users, investigate Google API quota usage for the project

### Revoked token during repair

If access was revoked (for example Google returns `invalid_grant`), backend
prunes Google data and emits `GOOGLE_REVOKED`.

Operational notes:

- this path does **not** end with an `IMPORT_GCAL_END` payload with
  `status: "ERRORED"`
- UI should transition to reconnect-required behavior rather than repeatedly
  retrying repair
- user action is to reconnect Google, then allow sync/import restart

## Google Connect Aborts With Local Events Sync Error

When a password-authenticated user connects Google from an existing session, the
client now attempts to sync IndexedDB-only Compass events **before**
`POST /api/auth/google/connect`.

If that pre-connect local sync fails, connect is intentionally aborted and the
user sees:

- `We could not sync your local events. Your changes are still saved on this device.`

What this means operationally:

- this is a local-to-cloud event migration failure, not an OAuth popup failure
- backend `connectGoogleToCurrentUser` is not called for that attempt
- no Google import restart should be observed from that click

Recommended triage:

1. inspect browser console/network for the local event sync request failure
2. resolve connectivity/auth issues to Compass APIs first
3. retry Google connect after local sync succeeds
