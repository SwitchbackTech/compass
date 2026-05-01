# Run Compass without the installer

Use this when you want to run Compass yourself with Bun instead of the self-host installer. This path is best for local use, development, or custom setups where you want to manage the services directly.

This is not the beginner self-host path. It assumes you already have MongoDB, SuperTokens Core, and Postgres running somewhere and know their connection URLs.

It also assumes you already know what MongoDB, SuperTokens, and Bun are, and you're comfortable wiring them together yourself. For the recommended self-host path, see [Server hosting guide](./server-guide.md).

## What you provide

Compass needs:

- the Compass web app
- the Compass backend API
- MongoDB (for signed-in event data)
- SuperTokens Core (for signup, login, and sessions)
- Postgres for SuperTokens

Optional:

- Google OAuth credentials, if you want Google sign-in or Google Calendar import

Leave Google credentials unset for password-only mode.

## Local manual setup

```bash
git clone https://github.com/SwitchbackTech/compass.git
cd compass
bun install
cp packages/backend/.env.local.example packages/backend/.env.local
```

Edit `packages/backend/.env.local` and set at minimum:

- `MONGO_URI`
- `SUPERTOKENS_URI`
- `SUPERTOKENS_KEY`
- `TOKEN_COMPASS_SYNC`
- `FRONTEND_URL`
- `BASEURL`
- `CORS`

Start the backend:

```bash
bun run dev:backend
```

In a second terminal, start the web app:

```bash
bun run dev:web
```

Open [http://localhost:9080](http://localhost:9080). Confirm the backend with:

```bash
curl http://localhost:3000/api/health
```

## Google in manual setup

Google is disabled unless both `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set to real, non-placeholder values. Watch notifications need a public HTTPS webhook URL Google can reach.

For the three modes (Off, Local development sign-in & import, Public watch notifications) and the `GCAL_WEBHOOK_BASEURL` development pattern, see [Google Calendar](./google-calendar.md).

## What to read next

For public HTTPS hosting, see [Server hosting guide](./server-guide.md).
