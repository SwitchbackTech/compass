# Environment Variables

All environment variables for the Compass self-host stack, grouped by category.

**Legend**
- **Required** — the backend refuses to start if the value is missing or invalid
- **Optional** — enables extra features when set; omit or leave blank to disable
- **Build-time** — baked into the web image at Docker build time; changing it after pulling from Docker Hub requires rebuilding the web image locally (see the commented-out `build:` blocks in `docker-compose.yml`)

---

## Compose Metadata

| Variable | Default | Description |
|---|---|---|
| `COMPASS_VERSION` | `latest` | Docker Hub image tag to pull for the `compass-web`, `compass-backend`, and `compass-mongo` images. Pin to a specific semver (e.g. `1.2.3`) for reproducible installs. The `./compass update` command pulls the tag set here. |

---

## Port Bindings

| Variable | Default | Description |
|---|---|---|
| `WEB_PORT` | `9080` | Host port the web container binds to on `127.0.0.1`. The container always listens on `9080` internally. |
| `PORT` | `3000` | Host port the backend container binds to on `127.0.0.1`. The container always listens on `3000` internally. |

---

## Runtime Behavior

| Variable | Default | Required | Valid values | Description |
|---|---|---|---|---|
| `NODE_ENV` | `production` | Yes | `production`, `development` | Controls runtime mode. Self-hosted installs always use `production`. Setting `development` changes the MongoDB database name to `dev_calendar`. |
| `TZ` | `Etc/UTC` | Yes | `Etc/UTC`, `UTC` | Timezone for the backend process. Only UTC variants are accepted. |
| `LOG_LEVEL` | `info` | No | `error` `warn` `info` `http` `verbose` `debug` `silly` | Winston log level. Logs are written to `/app/logs/app.log` in the backend container (persisted in the `compass_backend_logs` Docker volume) and to stdout. |

---

## URLs

| Variable | Default | Required | Description |
|---|---|---|---|
| `FRONTEND_URL` | `http://localhost:9080` | Yes | Full URL of the web frontend as seen by the backend. Used in CORS configuration and SuperTokens redirect targets. For a public server: `https://compass.example.com`. |
| `BASEURL` | `http://localhost:3000/api` | Yes, Build-time | Full URL of the backend API. Baked into the web image at build time. For a public server: `https://compass.example.com/api`. Changing this after pulling a pre-built image requires rebuilding the web image. |
| `CORS` | `http://localhost:9080,http://localhost:3000` | Yes | Comma-separated list of allowed CORS origins. Must include `FRONTEND_URL`. For a public server: `https://compass.example.com`. Note: this key is named `CORS` in `.env` but the backend splits it by comma and calls it `ORIGINS_ALLOWED` internally. |
| `GCAL_WEBHOOK_BASEURL` | _(empty)_ | No | Public HTTPS URL for Google Calendar push notification callbacks. Required only when Google OAuth is configured and you want real-time calendar sync. Must start with `https://`. When empty, watch notifications are disabled. |

---

## MongoDB

| Variable | Default | Required | Description |
|---|---|---|---|
| `MONGO_INITDB_ROOT_USERNAME` | `compass` | No | MongoDB root username created on first container startup. Must match the username in `MONGO_URI`. |
| `MONGO_INITDB_ROOT_PASSWORD` | _(generate)_ | Yes | MongoDB root password. Must match the password in `MONGO_URI`. Changing this after initial database creation requires a MongoDB user migration. |
| `MONGO_REPLICA_SET_KEY` | _(generate)_ | Yes | Shared secret used by MongoDB replica set members to authenticate each other. Compass runs a single-node replica set (`rs0`) because transactions require one. Written to `/data/configdb/mongo-keyfile` and persisted in the `compass_mongo_configdb` volume. |
| `MONGO_URI` | `mongodb://compass:<password>@mongo:27017/prod_calendar?authSource=admin&replicaSet=rs0` | Yes | Full MongoDB connection string. Must include `authSource=admin` and `replicaSet=rs0`. The hostname `mongo` resolves to the mongo container within the Docker network. |

---

## SuperTokens Postgres

These variables configure the Postgres instance used exclusively by SuperTokens Core for auth data.

| Variable | Default | Required | Description |
|---|---|---|---|
| `SUPERTOKENS_POSTGRES_USER` | `supertokens` | No | Postgres username created on first container startup. |
| `SUPERTOKENS_POSTGRES_PASSWORD` | _(generate)_ | Yes | Postgres password for the SuperTokens user. |
| `SUPERTOKENS_POSTGRES_DB` | `supertokens` | No | Postgres database name for SuperTokens. |

---

## SuperTokens Core

| Variable | Default | Required | Description |
|---|---|---|---|
| `SUPERTOKENS_URI` | `http://supertokens:3567` | Yes | URL of the SuperTokens Core service as seen by the backend. The hostname `supertokens` resolves within the Docker network. Do not expose this port externally. |
| `SUPERTOKENS_KEY` | _(generate)_ | Yes | API key for SuperTokens Core. The backend sends this in `api-key` request headers; SuperTokens Core validates it. Must be consistent between the `backend` and `supertokens` services. |

---

## Internal Tokens

| Variable | Default | Required | Description |
|---|---|---|---|
| `TOKEN_COMPASS_SYNC` | _(generate)_ | Yes | Bearer token protecting the internal Compass sync endpoint. |
| `TOKEN_GCAL_NOTIFICATION` | _(generate)_ | Required when Google webhooks are active | Bearer token for the Google Calendar webhook endpoint. Required when Google OAuth is configured and `BASEURL` or `GCAL_WEBHOOK_BASEURL` uses HTTPS — the backend schema rejects startup without it. Google includes this as a channel token in webhook requests so the backend can verify the caller. |

---

## Google OAuth

Both `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` must be set to non-placeholder values for Google features to activate — setting only one causes the backend to refuse to start. Leave the placeholder values to run in email/password-only mode.

See [google-calendar.md](./google-calendar.md) for step-by-step OAuth credential setup.

| Variable | Default | Required | Description |
|---|---|---|---|
| `GOOGLE_CLIENT_ID` | _(placeholder)_ | No, Build-time | Google OAuth 2.0 client ID. Baked into the web bundle at build time — changing this after pulling a pre-built image requires rebuilding the web image locally. |
| `GOOGLE_CLIENT_SECRET` | _(placeholder)_ | No | Google OAuth 2.0 client secret. Backend-only; not baked into the web image. |
| `CHANNEL_EXPIRATION_MIN` | `10` | No | Lifetime in minutes for Google Calendar watch channels before Compass renews them. The default is suitable for development. For production with watch notifications: consider `60`–`4320` (1 hour to 3 days). |

---

## Email (Optional)

Email integration uses [Kit](https://kit.com) (formerly ConvertKit). These variables are commented out in `packages/backend/.env.local.example`. Set them only if you are connecting Compass to a Kit account.

| Variable | Required | Description |
|---|---|---|
| `EMAILER_API_SECRET` | No | Kit.com API secret key. Note: the env key is `EMAILER_API_SECRET` but it maps to `EMAILER_SECRET` in the backend schema. |
| `EMAILER_USER_TAG_ID` | No | Kit.com tag ID applied to users on signup. |
