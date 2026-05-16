# Configuration

Compass uses `compass.yaml` for self-hosting and local development. The file is visible, diffable, and contains secrets, so keep it out of git and back it up with the Docker volumes.

Examples:

- local development: `packages/backend/compass.example.yaml`
- self-hosting: `self-host/compass.example.yaml`

## Runtime

| key | Required | Description |
|---|---|---|
| `runtime.version` | Self-host | Docker image tag used by the self-host compose stack. Defaults to `latest`. Pin this for reproducible installs. |
| `runtime.nodeEnv` | Yes | Runtime mode. Use `production` for self-hosted and staging; `development` for local dev. |
| `runtime.timezone` | Yes | Backend timezone. Only `Etc/UTC` and `UTC` are accepted. |
| `runtime.logLevel` | No | Winston log level. Defaults to `info`. |

## Web

| key | Required | Description |
|---|---|---|
| `web.port` | `9080` | Host port bound to the web container on `127.0.0.1`. |
| `web.url` | Yes | Public frontend URL as seen by the backend. Example: `https://compass.example.com`. |

## Backend

| key | Required | Description |
|---|---|---|
| `backend.port` | `3000` | Host port bound to the backend container on `127.0.0.1`. |
| `backend.apiUrl` | Yes | Public API URL. Example: `https://compass.example.com/api`. This is baked into the web bundle when the web image is rebuilt. |
| `backend.originsAllowed` | Yes | YAML list of allowed CORS origins. Include `web.url`. |
| `backend.compassToken` | Yes | Bearer token protecting internal sync endpoints. |

## MongoDB

| key | Required | Description |
|---|---|---|
| `mongo.uri` | Yes | Backend MongoDB connection string. For self-hosted installs, must include `authSource=admin` and `replicaSet=rs0`. |
| `mongo.username` | Self-host | MongoDB root username created on first container startup. Must match the credentials in `mongo.uri`. |
| `mongo.password` | Self-host | MongoDB root password. Changing it after first startup requires a MongoDB user migration. |
| `mongo.replicaSetKey` | Self-host | Shared secret used for internal authentication between replica set members. |

## SuperTokens

SuperTokens handles user-sessions for us.

| key | Required | Description |
|---|---|---|
| `supertokens.uri` | Yes | SuperTokens Core URL as seen by the backend. Self-hosted Docker uses `http://supertokens:3567`. |
| `supertokens.key` | Yes | API key shared by backend and SuperTokens Core. |
| `supertokens.postgres.user` | Self-host | Postgres user for the SuperTokens database container. |
| `supertokens.postgres.password` | Self-host | Postgres password for the SuperTokens database container. |
| `supertokens.postgres.database` | Self-host | Postgres database name for SuperTokens. |

## Google
These values are only necessary if you want to enable Google Oauth and/or 2-way sync between Compass and Google Calendar

Both `google.clientId` and `google.clientSecret` must be real values for Google features to activate. Setting only one causes backend startup to fail.

| key | Required | Description |
|---|---|---|
| `google.clientId` | No | Google OAuth client ID. Rebuild the web image after changing it. |
| `google.clientSecret` | No | Google OAuth client secret. Backend-only. |
| `google.channelExpirationMin` | No | Google Calendar watch channel lifetime in minutes. |
| `google.webhookUrl` | No | Public HTTPS API URL for Google Calendar push notifications. When omitted, Compass uses `backend.apiUrl`. |
| `google.notificationToken` | Required for HTTPS Google webhooks | Token used to verify Google Calendar webhook requests. |

See [Google Calendar](./google-calendar.md) for full setup instructions.

## Optional Integrations

| key | Required | Description |
|---|---|---|
| `email.kitApiSecret` | No | Kit.com API secret key. |
| `email.kitUserTagId` | No | Kit.com tag ID applied to users on signup. |
| `posthog.key` | No | PostHog project key injected into the web bundle. |
| `posthog.host` | No | PostHog host injected into the web bundle. |
