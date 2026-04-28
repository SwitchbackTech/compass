# Google Calendar

Google Calendar is optional for self-hosting.

Use the local Docker install without Google first unless you specifically need Google sign-in, Google import, or Google-to-Compass watch notifications.

## Path 1: No Google

This is the default local self-host path.

The installer writes placeholder Google OAuth values so Compass can start without a Google Cloud project. The web app treats those placeholder values as not configured, so Google sign-in and Google Calendar connect actions are hidden in the normal UI.

Use email/password signup. Event create, edit, and delete work without a Google connection.

## Path 2: Local Google OAuth And Import

This is an optional add-on.

This page documents the boundary between local OAuth/import and public webhook delivery. It is not a promise that a specific Google Cloud project is configured correctly until someone tests that project with real credentials.

You can try Google sign-in or connect Google Calendar from a local install by adding real Google OAuth values to `~/compass/.env`, then rebuilding:

```bash
cd ~/compass
# edit GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env
./compass rebuild
```

The local web app runs at `http://localhost:9080`, and the backend API runs at `http://localhost:3000/api`.

The current web OAuth flow reports the browser origin as the Google redirect origin, so local OAuth setup should allow `http://localhost:9080` in the Google OAuth client configuration.

This local path is intended for Google sign-in/connect and initial import when the Google OAuth project is configured correctly. It does not make the local backend public.

## Path 3: Public HTTPS Watch Notifications

Google-to-Compass watch notifications are different from browser traffic.

For Google to notify Compass about changes made in Google Calendar, Google must be able to send HTTPS `POST` requests to:

```text
/api/sync/gcal/notifications
```

The local installer does not create a public HTTPS URL. On the default local install, Compass can run without registering Google watches.

For development testing, the backend supports `GCAL_WEBHOOK_BASEURL` as a separate public HTTPS base URL for Google webhook callbacks. Keep normal app traffic local:

```bash
BASEURL=http://localhost:3000/api
GCAL_WEBHOOK_BASEURL=https://<public-https-host>/api
```

That setting is for Google webhook POSTs only. Browser API traffic and Server-Sent Events can keep using localhost.

## Continuous Sync Claim

Do not claim continuous Google Calendar sync for a self-host install unless the specific install has all of this working:

- real Google OAuth credentials
- a backend that Google can reach over public HTTPS
- `TOKEN_GCAL_NOTIFICATION` configured when the webhook URL uses HTTPS
- Google watch registration succeeding
- watch repair/refresh behavior verified for that install

The repo has code paths for Google watches and repair, but the local installer does not configure public HTTPS delivery or prove long-running watch maintenance for a personal self-host setup.
