# Connect Google Calendar

You can optionally connect your Google account to enable:

- Google OAuth (instead of the default email/password auth)
- Two-way sync between Compass Calendar and Google Calendar

Compass Sync — the same service that runs Google Calendar sync for the hosted `compasscalendar.com` — is part of every self-host install by default (the `sync` container in your `docker compose ps` output). It owns the whole calendar-sync lifecycle: connecting, importing, watching for changes, and pushing your edits back to Google. Signing in with a Google account is a separate, simpler flow that stays in the main backend.

## The three modes

| Mode | What it does | What you need | Who it's for |
| --- | --- | --- | --- |
| **Off (default)** | Google sign-in and connect actions are hidden. Email/password signup works normally. | Nothing. | Everyone who doesn't need Google. |
| **Local development sign-in & connect** | Google sign-in works. Connecting a calendar works and imports your existing events. Google can't reach `localhost`, so later changes made directly in Google Calendar won't arrive automatically until you set up a public URL. | A Google Cloud OAuth client that allows `http://localhost:9080` (sign-in) and `http://localhost:3010/sync/google` (connect), plus `google.clientId` and `google.clientSecret` in `compass.yaml`. | Bun-based local setups that want Google sign-in or to try connecting a calendar. |
| **Public, fully-live sync** | Two-way sync: your Compass edits reach Google and Google's changes arrive in Compass, usually within seconds via push notifications (a periodic catch-up covers any it misses). | A public HTTPS URL Google can reach (`sync.callbackBaseUrl`), real Google OAuth credentials, and `google.notificationToken` set. | Server installs. See [Server hosting guide](./server-guide.md). |

Most self-hosters should start with **Off** or a public server setup. Continuous sync needs a public server because Google sends notifications over the public internet.

## Off (default)

The installer writes placeholder Google OAuth values to `~/compass/compass.yaml`. Compass treats those placeholders as not configured, so Google sign-in and Google Calendar connect actions stay hidden in the UI.

Sign up with email and password. Event create, edit, and delete all work without a Google connection. Nothing more to do.

## Local development sign-in & connect

This is an optional add-on for a Bun-based local setup. Sign-in and connecting a calendar both work over `localhost`; push notifications do not, because Google can't reach `localhost`. Once connected, Compass still catches up on later Google-side changes periodically (every ~10 minutes) even without push — just not immediately.

Add real Google OAuth values to `compass.yaml`:

```yaml
google:
  clientId: <your-google-client-id>
  clientSecret: <your-google-client-secret>
```

Then rebuild so the web app picks up the new values:

```bash
cd ~/compass
./compass rebuild
```

In your Google Cloud OAuth client, use **Web application** as the client type and allow both local origins — one for sign-in, one for connecting a calendar:

```text
Authorized JavaScript origins:
  http://localhost:9080

Authorized redirect URIs:
  http://localhost:9080/auth/google/callback   # sign-in
  http://localhost:3010/sync/google            # connect a calendar
```

Sign-in (`/auth/google/callback`) is a popup flow handled by the main backend. Connecting a calendar (`/sync/google`) is a full-page redirect handled by the Sync service — the browser navigates to Google and back, so it needs no JavaScript origin of its own, only the redirect URI above.

This path doesn't make your local backend public. It's for sign-in and trying out connect only.

## Public, fully-live sync

For Google to notify Compass when something changes in Google Calendar, Google must be able to send HTTPS `POST` requests to:

```text
/sync/notifications/google
```

Local setups do not create a public HTTPS URL, so they can't receive these. Run Compass on a public server — see [Server hosting guide](./server-guide.md), which includes the Caddy configuration that proxies `/sync/*` (both the OAuth callback and this webhook path) to the `sync` container.

### Google Cloud setup

For a public server install, create a Google OAuth client with **Web application** as the client type.

Use your public Compass origin for sign-in, and the same origin's `/sync/google` path for connect:

```text
Authorized JavaScript origins:
  https://cal.example.com

Authorized redirect URIs:
  https://cal.example.com/auth/google/callback   # sign-in
  https://cal.example.com/sync/google            # connect a calendar
```

Replace `https://cal.example.com` with your own Compass URL. Do not add `/api` to either redirect URI.

Also check these in Google Cloud:

- The Google Calendar API is enabled for the same project as the OAuth client.
- The OAuth consent screen is configured.
- If the app is in Testing mode, the Google account you use in Compass is listed under **Audience -> Test users**.

If Google shows `Error 403: access_denied` and says the app has not completed verification, the account is usually missing from the test-user list. Add it there, then retry the Compass connect flow.

### Configure Compass

On the server, add the real Google OAuth values to `~/compass/compass.yaml`:

```yaml
google:
  clientId: <your-google-client-id>
  clientSecret: <your-google-client-secret>
```

Then point Sync's `callbackBaseUrl` at your public origin (the installer defaults it to `http://localhost:3010`, which only works for local connect, not Google push):

```yaml
sync:
  callbackBaseUrl: https://cal.example.com
```

Next, check the notification secret Compass uses to verify Google webhook calls. Keep `google.notificationToken` set:

- If you installed with the self-host installer, leave the generated value in place.
- If you are creating `compass.yaml` manually, set it to a long random secret.

This is a Compass webhook secret, not a Google credential.

Then restart so both changes take effect (`callbackBaseUrl` and rebuilding the web image for the OAuth values):

```bash
cd ~/compass
./compass rebuild
./compass restart
```

After that, check that the public app sees Google as configured:

```bash
curl -fsS https://cal.example.com/api/config
```

The response should include:

```json
{"google":{"isConfigured":true}}
```

### Compass account match

When you connect Google Calendar to an existing email/password Compass account, choose the same email address in Google that you used for the signed-in Compass account.

If the emails do not match, Compass rejects the connection and shows:

```text
Google account email does not match the signed-in Compass account
```

Before you call continuous Google Calendar sync "working" on any self-host install, verify all of these on that specific install:

- real Google OAuth credentials configured
- `sync.callbackBaseUrl` reachable by Google over public HTTPS
- `google.notificationToken` set
- the `sync` container healthy (`docker compose ps`)

To confirm sync is live: create or edit one event directly in Google Calendar and confirm it appears in Compass without reconnecting Google. Then restart Compass and confirm the connection still works after restart.

Sync manages its own push-notification channels and their renewal — no separate cron or maintenance step needed, unlike the older backend-only sync engine. Google push delivery is still not guaranteed (notifications can be delayed or dropped), so Compass never depends on push alone: every connected calendar also converges through a periodic reconcile pass (roughly every 10 minutes) that catches up on anything a missed webhook would have delivered.

## What to read next

If you need public Google watch notifications, continue with [Server hosting guide](./server-guide.md).

----

Have an idea on how we can make self-hosting easier? Let us know in [this GitHub Discussion](https://github.com/SwitchbackTech/compass/discussions/1694).
