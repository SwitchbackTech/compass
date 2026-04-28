# Advanced Manual Setup

Use this only if the local installer does not fit your needs.

For most personal self-hosting, use [Local Quickstart](./local-quickstart.md) instead.

Manual setup means you run the pieces yourself. It is not a beginner public server guide.

## Pieces You Provide

Compass needs:

- the Compass web app
- the Compass backend API
- MongoDB for signed-in event data
- SuperTokens for signup, login, and sessions
- durable SuperTokens storage, usually Postgres

Optional:

- Google OAuth credentials, only if you want Google sign-in or Google Calendar connection

Leave Google credentials unset for password-only mode.

## Local Manual Steps

From the repo root:

```bash
git clone https://github.com/SwitchbackTech/compass.git
cd compass
bun install
cp packages/backend/.env.local.example packages/backend/.env.local
```

Edit `packages/backend/.env.local` and provide:

- `MONGO_URI`
- `SUPERTOKENS_URI`
- `SUPERTOKENS_KEY`
- `TOKEN_COMPASS_SYNC`
- `FRONTEND_URL`
- `BASEURL`
- `CORS`

Then start the backend:

```bash
bun run dev:backend
```

In another terminal, start the web app:

```bash
bun run dev:web
```

Open [http://localhost:9080](http://localhost:9080).

Check backend health with:

```bash
curl http://localhost:3000/api/health
```

## Google In Manual Setup

Google is disabled unless both `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set.

Google sign-in and local import can use localhost during development. Google watch notifications need a public HTTPS webhook URL that Google can reach.

For local watch testing, keep browser traffic local and set only the Google webhook callback base URL to a public HTTPS tunnel:

```bash
BASEURL=http://localhost:3000/api
GCAL_WEBHOOK_BASEURL=https://<public-https-host>/api
```

## Public Servers

Do not treat this page as a public production guide. See [Server Hosting Guide](./server-guide.md) for the recommended one-domain server shape.
