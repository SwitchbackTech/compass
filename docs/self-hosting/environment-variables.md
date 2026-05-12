# Environment Variables

All environment variables for the Compass self-host stack, grouped by category.

Copy `self-host/.env.example` to `.env` in your Compass home directory and fill in the values.
Generate secrets with `openssl rand -hex 32`.

**Legend**
- **Required** — the backend refuses to start if the value is missing or invalid
- **Optional** — enables extra features when set; omit or leave blank to disable
- **Build-time** — baked into the web image at Docker build time; changing it after pulling from Docker Hub requires rebuilding the web image locally (see the commented-out `build:` blocks in `docker-compose.yml`)

---

## Compose Metadata

### `COMPOSE_PROJECT_NAME`
Default: `compass`

Docker Compose project name. All Docker resources (containers, volumes, networks) are prefixed with this value. Change only if you need multiple isolated Compass installs on the same host.

### `COMPASS_VERSION`
Default: `latest`

Docker Hub image tag to pull for the `compass-web`, `compass-backend`, and `compass-mongo` images. Pin to a specific semver (e.g. `1.2.3`) for reproducible installs. The `./compass update` command pulls the tag currently set here.

---

## Port Bindings

### `WEB_PORT`
Default: `9080`

Host port the web container binds to on `127.0.0.1`. The container always listens on `9080` internally; this controls the external binding.

### `PORT`
Default: `3000`

Host port the backend container binds to on `127.0.0.1`. The container always listens on `3000` internally.

---

## Runtime Behavior

### `NODE_ENV`
**Required** | Default: `production`  
Valid values: `production`, `development`

Controls the runtime mode. Self-hosted installs always use `production`. Setting `development` changes the MongoDB database name to `dev_calendar` instead of `prod_calendar`.

### `TZ`
**Required** | Default: `Etc/UTC`  
Valid values: `Etc/UTC`, `UTC`

Timezone for the backend process. Only UTC variants are accepted by the schema validator.

### `LOG_LEVEL`
Default: `info`  
Valid values: `error`, `warn`, `info`, `http`, `verbose`, `debug`, `silly`

Winston log level for the backend. Logs are written to `/app/logs/app.log` inside the backend container (persisted in the `compass_backend_logs` Docker volume) and also to stdout.

---

## URLs

### `FRONTEND_URL`
**Required** | Default: `http://localhost:9080`

Full URL of the web frontend as seen by the backend. Used in CORS configuration and SuperTokens redirect targets. For a public server install, set this to your HTTPS domain: `https://compass.example.com`.

### `BASEURL`
**Required** | **Build-time** | Default: `http://localhost:3000/api`

Full URL of the backend API. Used by the backend for self-referencing URLs and baked into the web image at build time. For a public server install: `https://compass.example.com/api`. Changing this after pulling a pre-built image from Docker Hub requires rebuilding the web image.

### `CORS`
**Required** | Default: `http://localhost:9080,http://localhost:3000`

Comma-separated list of allowed CORS origins. Must include `FRONTEND_URL`. For a public server install: `https://compass.example.com`.

> **Note:** This key is named `CORS` in `.env` but is split by comma and passed to the backend as `ORIGINS_ALLOWED`. You may see `ORIGINS_ALLOWED` referenced in backend logs.

### `GCAL_WEBHOOK_BASEURL`
**Optional** | Default: (empty — disabled)

Public HTTPS URL the backend advertises for Google Calendar push notification callbacks. Required only when Google OAuth is configured and you want real-time calendar sync. Must start with `https://` — the backend schema rejects `http://`. Example: `https://compass.example.com/api`.

When empty, `BASEURL` is used for all other API references but watch notifications are not registered.

---

## MongoDB

### `MONGO_INITDB_ROOT_USERNAME`
Default: `compass`

MongoDB root username created on first container startup. Must match the username in `MONGO_URI`.

### `MONGO_INITDB_ROOT_PASSWORD`
**Required — generate** | Placeholder: `change-me-mongo-password-32chars`

MongoDB root password. Must match the password in `MONGO_URI`. Changing this after the initial database creation requires a MongoDB user migration — it is not enough to update the `.env`.

### `MONGO_REPLICA_SET_KEY`
**Required — generate** | Placeholder: `change-me-mongo-replica-set-key-32chars`

Shared secret used by MongoDB replica set members to authenticate each other. Compass runs a single-node replica set (`rs0`) because multi-document transactions require one. This key is written to `/data/configdb/mongo-keyfile` inside the mongo container on startup and persisted in the `compass_mongo_configdb` volume.

### `MONGO_URI`
**Required**

Full MongoDB connection string. Must include `authSource=admin` and `replicaSet=rs0`.

Default for Docker Compose installs:
```
mongodb://compass:<MONGO_INITDB_ROOT_PASSWORD>@mongo:27017/prod_calendar?authSource=admin&replicaSet=rs0
```

The hostname `mongo` resolves to the mongo container within the Docker network. Do not use `dev_calendar` as the database name in production installs.

---

## SuperTokens Postgres

These variables configure the Postgres instance used exclusively by SuperTokens Core for auth data.

### `SUPERTOKENS_POSTGRES_USER`
Default: `supertokens`

Postgres username created on first container startup.

### `SUPERTOKENS_POSTGRES_PASSWORD`
**Required — generate** | Placeholder: `change-me-supertokens-postgres-pass-32`

Postgres password for the SuperTokens user.

### `SUPERTOKENS_POSTGRES_DB`
Default: `supertokens`

Postgres database name for SuperTokens.

---

## SuperTokens Core

### `SUPERTOKENS_URI`
**Required** | Default: `http://supertokens:3567`

URL of the SuperTokens Core service as seen by the backend. The hostname `supertokens` resolves within the Docker network. Do not expose this port externally.

### `SUPERTOKENS_KEY`
**Required — generate** | Placeholder: `change-me-supertokens-key-32chars`

API key for SuperTokens Core. The backend sends this in `api-key` request headers; SuperTokens Core validates it. Must be consistent between the `backend` and `supertokens` services.

---

## Internal Tokens

### `TOKEN_COMPASS_SYNC`
**Required — generate** | Placeholder: `change-me-compass-sync-token-32chars`

Bearer token protecting the internal Compass sync endpoint. Must be a non-empty string.

### `TOKEN_GCAL_NOTIFICATION`
**Required when Google webhooks are active — generate** | Placeholder: `change-me-gcal-notification-token-32chars`

Bearer token for the Google Calendar webhook notification endpoint. When Google OAuth is configured and `BASEURL` or `GCAL_WEBHOOK_BASEURL` uses HTTPS, this token is required — the backend schema will reject startup without it. Google includes this as a channel token in webhook requests, allowing the backend to verify the caller.

---

## Google OAuth

All four Google variables are optional. Leave the placeholder values to run in email/password-only mode. Both `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` must be set to non-placeholder values for Google features to activate — setting only one causes the backend to refuse to start.

See [google-calendar.md](./google-calendar.md) for step-by-step OAuth credential setup.

### `GOOGLE_CLIENT_ID`
**Optional** | **Build-time** | Placeholder: `compass-self-host-placeholder.apps.googleusercontent.com`

Google OAuth 2.0 client ID. Baked into the web bundle at image build time — changing this after pulling a pre-built image requires rebuilding the web image locally.

### `GOOGLE_CLIENT_SECRET`
**Optional** | Placeholder: `compass-self-host-placeholder-secret`

Google OAuth 2.0 client secret. Backend-only; not baked into the web image.

### `CHANNEL_EXPIRATION_MIN`
Default: `10`

Lifetime in minutes for Google Calendar watch channels before Compass renews them. Lower values increase renewal frequency and API quota usage. The default of 10 minutes is suitable for development. For production installs with watch notifications: consider 60–4320 (1 hour to 3 days).

---

## Email (Optional)

Email integration uses [Kit](https://kit.com) (formerly ConvertKit). These variables are not required and are not included in `.env.example`. Set them only if you are connecting Compass to a Kit account.

### `EMAILER_API_SECRET`
**Optional**

Kit.com API secret key. Note: the environment variable is `EMAILER_API_SECRET`, but it maps to `EMAILER_SECRET` in the backend schema.

### `EMAILER_USER_TAG_ID`
**Optional**

Kit.com tag ID applied to users on signup.

---

## Health Endpoint

Compass exposes a health check endpoint that you can use for monitoring, load balancer probes, or readiness checks:

```
GET /api/health
```

**Response (healthy):** `200 OK`
```json
{"status": "ok", "timestamp": "2025-01-01T00:00:00.000Z"}
```

**Response (unhealthy):** `500 Internal Server Error`
```json
{"status": "error", "timestamp": "2025-01-01T00:00:00.000Z"}
```

The check calls `db.admin().ping()` against MongoDB. No authentication required.
