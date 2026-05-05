# Add Google Calendar (optional)

Google Calendar is optional for self-hosting. Compass works fine with email and password alone. Pick a mode based on what you actually need.

## The three modes

| Mode | What it does | What you need | Who it's for |
| --- | --- | --- | --- |
| **Off (default)** | Google sign-in and connect actions are hidden. Email/password signup works normally. | Nothing. | Everyone who doesn't need Google. |
| **Local development sign-in & import** | Google sign-in works. One-time Google Calendar import works. No continuous sync. | A Google Cloud OAuth client that allows `http://localhost:9080`, plus `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in your local env file. | Bun-based local setups that want Google sign-in or a one-time import. |
| **Public watch notifications** | Google can notify Compass when calendar events change. | A public HTTPS URL Google can reach, real Google OAuth credentials, `TOKEN_GCAL_NOTIFICATION` set, and verified Google watch registration and repair on this install. | Server installs only. See [Server hosting guide](./server-guide.md). |

Most self-hosters should start with **Off** or a public server setup. Continuous sync needs a public server because Google sends notifications over the public internet.

## Off (default)

The installer writes placeholder Google OAuth values to `~/compass/.env`. Compass treats those placeholders as not configured, so Google sign-in and Google Calendar connect actions stay hidden in the UI.

Sign up with email and password. Event create, edit, and delete all work without a Google connection. Nothing more to do.

## Local development sign-in & import

This is an optional add-on for a Bun-based local setup. Browser-driven flows (sign-in, one-time import) work. Watch notifications do not, because Google can't reach `localhost`. After the import, changes made later in Google Calendar will not reliably arrive in Compass unless you also set up public HTTPS watch notifications.

Add real Google OAuth values to your local environment file:

```bash
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
```

Then rebuild so the web app picks up the new values:

```bash
cd ~/compass
./compass rebuild
```

In your Google Cloud OAuth client, use **Web application** as the client type and allow the local origin:

```text
Authorized JavaScript origins:
  http://localhost:9080

Authorized redirect URIs:
  http://localhost:9080/auth/google/callback
```

Compass sends the dedicated Google callback page as the OAuth redirect URI.
That means the redirect URI includes `/auth/google/callback`.

This path doesn't make your local backend public. It's for sign-in and one-time import only.

## Public watch notifications

For Google to notify Compass when something changes in Google Calendar, Google must be able to send HTTPS `POST` requests to:

```text
/api/sync/gcal/notifications
```

Local setups do not create a public HTTPS URL, so they can't receive these. You have two paths:

- **Run Compass on a public server.** The recommended path. See [Server hosting guide](./server-guide.md).
- **Use a public HTTPS tunnel for webhooks only (development).** The backend supports `GCAL_WEBHOOK_BASEURL` as a separate public HTTPS base URL for Google webhook callbacks. Browser API traffic and Server-Sent Events keep using localhost:

  ```bash
  BASEURL=http://localhost:3000/api
  GCAL_WEBHOOK_BASEURL=https://<public-https-host>/api
  ```

  This is for Google webhook POSTs only.

### Google Cloud setup

For a public server install, create a Google OAuth client with **Web application** as the client type.

Use your public Compass origin for JavaScript origins and the Compass callback
page for redirect URIs:

```text
Authorized JavaScript origins:
  https://cal.example.com

Authorized redirect URIs:
  https://cal.example.com/auth/google/callback
```

Replace `https://cal.example.com` with your own Compass URL. Do not add `/api`
to the redirect URI.

Also check these in Google Cloud:

- The Google Calendar API is enabled for the same project as the OAuth client.
- The OAuth consent screen is configured.
- If the app is in Testing mode, the Google account you use in Compass is listed under **Audience -> Test users**.

If Google shows `Error 403: access_denied` and says the app has not completed verification, the account is usually missing from the test-user list. Add it there, then retry the Compass connect flow.

### Configure Compass

On the server, add the real Google OAuth values to `~/compass/.env`:

```bash
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
```

Next, check the notification secret Compass uses to verify Google webhook calls.
Keep `TOKEN_GCAL_NOTIFICATION` set:

- If you installed with the self-host installer, leave the generated value in place.
- If you are creating `.env` manually, set it to a long random secret.

This is a Compass webhook secret, not a Google credential.

Then rebuild:

```bash
cd ~/compass
./compass rebuild
```

After the rebuild, check that the public app sees Google as configured:

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
- backend reachable by Google over public HTTPS
- `TOKEN_GCAL_NOTIFICATION` set
- Google watch registration succeeds
- watch repair and refresh behavior holds up over time

The repo has the code paths for Google watches and repair. The self-host Docker stack does not schedule watch renewal, so you need to verify and wire up maintenance separately before treating ongoing Google sync as dependable.

## What to read next

If you are using local development, use [Run Compass without the installer](./advanced-manual.md). If you need public Google watch notifications, continue with [Server hosting guide](./server-guide.md).
