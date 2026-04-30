# Google Calendar VPS test log

This is a working log from testing Google Calendar on the public self-hosted
Compass install at `https://cal.ugur.dev`.

The goal is to follow the existing self-host Google docs, note any gaps, and
keep track of what we changed or verified along the way.

## Context

- Public Compass URL: `https://cal.ugur.dev`
- Backend health URL: `https://cal.ugur.dev/api/health`
- VPS provider: Hetzner
- DNS: `cal.ugur.dev` points to the VPS IPv4 address
- Reverse proxy: Caddy
- Compass mode before this test: password-only self-hosting
- Google mode being tested: public HTTPS server install with Google OAuth and
  Calendar access

## Docs checked

- `docs/self-hosting/google-calendar.md`
- `docs/self-hosting/server-guide.md`
- Relevant implementation references for exact env and redirect behavior:
  - `self-host/docker-compose.yml`
  - `packages/backend/src/common/constants/env.constants.ts`
  - `packages/backend/src/common/middleware/supertokens.middleware.ts`
  - `packages/web/src/auth/google/hooks/useGoogleLogin/useGoogleLogin.ts`

## What the docs clearly said

- Google Calendar is optional for self-hosting.
- Password-only mode works without Google credentials.
- Public watch notifications require a public HTTPS URL Google can reach.
- Server installs should use the server guide first.
- Real Google OAuth credentials must be added to `~/compass/.env`.
- `TOKEN_GCAL_NOTIFICATION` must be set for webhook notification validation.
- `./compass rebuild` is required after changing Google client values.

## What we had to infer or verify from code

- The web app uses an auth-code Google OAuth flow.
- The frontend sends `window.location.origin` as the provider redirect URI.
- For `https://cal.ugur.dev`, both the authorized JavaScript origin and the
  authorized redirect URI should be `https://cal.ugur.dev`.
- The backend only enables Google when both `GOOGLE_CLIENT_ID` and
  `GOOGLE_CLIENT_SECRET` are real non-placeholder values.
- The self-host Docker Compose file passes `GCAL_WEBHOOK_BASEURL` through to the
  backend, but a one-domain public server can rely on `BASEURL` for webhook
  callbacks.

## Google Cloud Console state observed

- Current Google Cloud project in the console: `openClaw`
- Project id in URL: `skilful-album-485922-d6`
- Existing OAuth client observed: one Desktop client named `gog`
- No suitable Web application OAuth client for `https://cal.ugur.dev` was
  observed before this test.

## OAuth client created

User confirmed creating a persistent Google OAuth client for the VPS test.

```text
Type: Web application
Name: Compass self-host cal.ugur.dev
Authorized JavaScript origins:
  https://cal.ugur.dev
Authorized redirect URIs:
  https://cal.ugur.dev
```

- Created in Google Cloud Console on April 30, 2026.
- Client ID was generated and shown by Google Cloud Console.
- Client secret was generated and shown once by Google Cloud Console.
- OAuth access is currently restricted to test users listed on the OAuth
  consent screen.
- Google Calendar API is already enabled for this project.
- OAuth publishing status is `Testing`.
- Test user list already includes `ugurarmagan93@gmail.com`.

Do not store the generated client secret in this log or in the repo. Keep the
Google Cloud dialog open until the secret is copied into the VPS `.env` file or
stored somewhere safe.

## Things to watch for while testing

- Whether Google Console requires more consent-screen setup before the OAuth
  client can be used.
- Whether the Calendar API is enabled for the selected project.
- Whether test users need to be added for the Google account used in the flow.
- Whether Compass surfaces Google sign-in/connect controls after the rebuild.
- Whether Google sign-in works separately from Calendar import/sync.
- Whether Google watch registration succeeds after Calendar import/connect.
- Whether webhook delivery reaches `POST /api/sync/gcal/notifications`.

## VPS env and rebuild

- Connected to the VPS over SSH.
- Confirmed existing public values:
  - `FRONTEND_URL=https://cal.ugur.dev`
  - `BASEURL=https://cal.ugur.dev/api`
  - `CORS=https://cal.ugur.dev`
  - `TOKEN_GCAL_NOTIFICATION` was already set.
- Backed up `~/compass/.env`.
- Replaced placeholder Google OAuth values with the new Google client ID and
  client secret.
- Kept the Google client secret out of this log.
- Ran `./compass rebuild`.
- Rebuild completed and all Compass containers came back up.
- Public health check passed:
  `https://cal.ugur.dev/api/health`
- Public config check showed Google enabled:
  `{"google":{"isConfigured":true}}`

## First Google connect attempt

- Opened the command palette in the live app.
- Selected `Connect Google Calendar`.
- Google OAuth opened with the new client ID and the expected Calendar scopes.
- Attempted to connect with `ugurarmagan93@gmail.com`.
- Compass showed this error:
  `Google account email does not match the signed-in Compass account`.
- Root cause confirmed from code: when connecting Google Calendar to an
  existing email/password Compass user, Compass requires the Google account
  email to match the signed-in Compass account email.
- Root cause confirmed from the VPS database: the current Compass user on this
  test instance is `ugurs.burner@gmail.com`, and it has no Google connection
  yet.

## Second Google connect attempt

- Retried Google connect with `ugurs.burner@gmail.com`, matching the signed-in
  Compass account.
- Google OAuth returned:
  `Error 403: access_denied`.
- Google's page said the app has not completed the Google verification process
  and is currently being tested.
- Root cause: the OAuth app is in `Testing` mode, and only listed test users
  can access it. `ugurarmagan93@gmail.com` was listed as a test user, but
  `ugurs.burner@gmail.com` was not.
- This is a Google Cloud Console test-user configuration issue, not the earlier
  Compass email mismatch issue.
- Added `ugurs.burner@gmail.com` as a Google OAuth test user.
- Retried the connect flow and successfully connected Google Calendar for the
  `ugurs.burner@gmail.com` Compass account.
- VPS database verification after connect:
  - Google ID is stored for the Compass user.
  - Google refresh token is stored for the Compass user.
  - Google profile picture is stored for the Compass user.
  - `calendar` and `sync` records exist.
- Backend log verification after connect:
  - `POST /api/auth/google/connect` returned 200.
  - Google Calendar import started and completed.
  - Google watch channels initialized for events and calendar list.
  - Google delivered webhook notifications to
    `POST /api/sync/gcal/notifications`, and Compass returned 200.
  - Compass processed a Google Calendar notification for
    `ugurs.burner@gmail.com`.
- During webhook processing, Google returned one `fullSyncRequired` response.
  Compass handled it by forcing a full sync, importing again, acquiring a new
  sync token, and continuing.

## Potential documentation gaps

- `google-calendar.md` does not list the exact Google Cloud Console fields for
  a public server OAuth client.
- `google-calendar.md` does not say that Compass expects the OAuth redirect URI
  to be the site origin, for example `https://cal.ugur.dev`, not a longer
  callback path.
- `google-calendar.md` does not include a quick checklist for Google Cloud
  consent screen, test users, OAuth client type, Calendar API enablement, and
  Compass env values.
- `google-calendar.md` does not explicitly mention that connecting Google to an
  existing Compass email/password account requires choosing the same Google
  email as the signed-in Compass account.
- `google-calendar.md` should mention that if the OAuth app is in Testing mode,
  the Google account used during the connect flow must be added under Google
  Auth Platform -> Audience -> Test users.
