# Add Google Calendar (optional)

Google Calendar is optional for self-hosting. Compass works fine with email and password alone. Pick a mode based on what you actually need.

## The three modes

| Mode | What it does | What you need | Who it's for |
| --- | --- | --- | --- |
| **Off (default)** | Google sign-in and connect actions are hidden. Email/password signup works normally. | Nothing. | Everyone who doesn't need Google. |
| **Local sign-in & import** | Google sign-in works. One-time Google Calendar import works. No continuous sync. | A Google Cloud OAuth client that allows `http://localhost:9080`, plus `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `~/compass/.env`. | Local installs that want Google sign-in or a one-time import. |
| **Public watch notifications** | Google can notify Compass when calendar events change. | A public HTTPS URL Google can reach, real Google OAuth credentials, `TOKEN_GCAL_NOTIFICATION` set, and verified Google watch registration and repair on this install. | Server installs only. See [Server hosting guide](./server-guide.md). |

Most local self-hosters want **Off** or **Local sign-in & import**. Continuous sync needs a public server because Google sends notifications over the public internet.

## Off (default)

The installer writes placeholder Google OAuth values to `~/compass/.env`. Compass treats those placeholders as not configured, so Google sign-in and Google Calendar connect actions stay hidden in the UI.

Sign up with email and password. Event create, edit, and delete all work without a Google connection. Nothing more to do.

## Local sign-in & import

This is an optional add-on for the local install. Browser-driven flows (sign-in, one-time import) work. Watch notifications do not, because Google can't reach `localhost`.

Add real Google OAuth values to `~/compass/.env`:

```bash
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
```

Then rebuild so the web app picks up the new values:

```bash
cd ~/compass
./compass rebuild
```

In your Google Cloud OAuth client, allow the local origin. The web OAuth flow reports the browser origin as the redirect origin, so the local install needs `http://localhost:9080` configured.

This path doesn't make your local backend public. It's for sign-in and one-time import only.

## Public watch notifications

For Google to notify Compass when something changes in Google Calendar, Google must be able to send HTTPS `POST` requests to:

```text
/api/sync/gcal/notifications
```

The local installer doesn't create a public HTTPS URL, so a default local install can't receive these. You have two paths:

- **Run Compass on a public server.** The recommended path. See [Server hosting guide](./server-guide.md).
- **Use a public HTTPS tunnel for webhooks only (development).** The backend supports `GCAL_WEBHOOK_BASEURL` as a separate public HTTPS base URL for Google webhook callbacks. Browser API traffic and Server-Sent Events keep using localhost:

  ```bash
  BASEURL=http://localhost:3000/api
  GCAL_WEBHOOK_BASEURL=https://<public-https-host>/api
  ```

  This is for Google webhook POSTs only.

Before you call continuous Google Calendar sync "working" on any self-host install, verify all of these on that specific install:

- real Google OAuth credentials configured
- backend reachable by Google over public HTTPS
- `TOKEN_GCAL_NOTIFICATION` set
- Google watch registration succeeds
- watch repair and refresh behavior holds up over time

The repo has the code paths for Google watches and repair. The local installer doesn't configure public HTTPS or prove long-running watch maintenance for you.
