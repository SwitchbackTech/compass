# Compass YAML Configuration

Compass uses `compass.yaml` for self-hosting and local development. The file is visible, diffable, and contains secrets, so keep it out of git and back it up with the Docker volumes.

Examples:

- local development: `packages/backend/compass.example.yaml`
- self-hosting: `self-host/compass.example.yaml`

## Top-Level Sections

| YAML path | Default | Description |
|---|---|---|
| `compose.version` | `latest` | Docker image tag used by the self-host compose stack. Pin this for reproducible installs. |
| `ports.web` | `9080` | Host port bound to the web container on `127.0.0.1`. |
| `ports.backend` | `3000` | Host port bound to the backend container on `127.0.0.1`. |
| `runtime.nodeEnv` | `production` | Runtime mode. Self-hosted installs should use `production`; local development uses `development`. |
| `runtime.timezone` | `Etc/UTC` | Backend timezone. Only `Etc/UTC` and `UTC` are accepted. |
| `runtime.logLevel` | `info` | Winston log level. |

## URLs

| YAML path | Required | Description |
|---|---|---|
| `urls.frontend` | Yes | Public frontend URL as seen by the backend. Example: `https://compass.example.com`. |
| `urls.backendApi` | Yes | Public API URL. Example: `https://compass.example.com/api`. This is baked into the web bundle when the web image is rebuilt. |
| `urls.cors` | Yes | YAML list of allowed CORS origins. Include `urls.frontend`. |
| `urls.googleWebhook` | No | Public HTTPS API URL for Google Calendar push notifications. When omitted, Compass uses `urls.backendApi`. |
| `urls.health` | No | Override for helper health checks, usually `http://127.0.0.1:3000/api/health` when the public URL is behind Caddy. |

## MongoDB

| YAML path | Required | Description |
|---|---|---|
| `mongo.username` | Self-host | MongoDB root username created on first container startup. Must match `mongo.uri`. |
| `mongo.password` | Self-host | MongoDB root password. Changing it after first startup requires a MongoDB user migration. |
| `mongo.replicaSetKey` | Self-host | MongoDB replica set key for the single-node `rs0` replica set. |
| `mongo.uri` | Yes | Backend MongoDB connection string. Self-hosted installs must include `authSource=admin` and `replicaSet=rs0`. |

## SuperTokens

| YAML path | Required | Description |
|---|---|---|
| `supertokens.uri` | Yes | SuperTokens Core URL as seen by the backend. Self-hosted Docker uses `http://supertokens:3567`. |
| `supertokens.key` | Yes | API key shared by backend and SuperTokens Core. |
| `supertokens.postgres.user` | Self-host | Postgres user for the SuperTokens database container. |
| `supertokens.postgres.password` | Self-host | Postgres password for the SuperTokens database container. |
| `supertokens.postgres.database` | Self-host | Postgres database name for SuperTokens. |

## Tokens

| YAML path | Required | Description |
|---|---|---|
| `tokens.compassSync` | Yes | Bearer token protecting internal sync endpoints. |
| `tokens.googleCalendarNotification` | Required for HTTPS Google webhooks | Token used to verify Google Calendar webhook requests. |

## Google OAuth

Both `google.clientId` and `google.clientSecret` must be real values for Google features to activate. Setting only one causes backend startup to fail. Leave the self-host placeholders in place for password-only mode.

| YAML path | Required | Description |
|---|---|---|
| `google.clientId` | No | Google OAuth client ID. Rebuild the web image after changing it. |
| `google.clientSecret` | No | Google OAuth client secret. Backend-only. |
| `google.channelExpirationMin` | No | Google Calendar watch channel lifetime in minutes. |

See [Google Calendar](./google-calendar.md) for OAuth setup.

## Optional Integrations

| YAML path | Required | Description |
|---|---|---|
| `email.kitApiSecret` | No | Kit.com API secret key. |
| `email.kitUserTagId` | No | Kit.com tag ID applied to users on signup. |
| `posthog.key` | No | PostHog project key injected into the web bundle. |
| `posthog.host` | No | PostHog host injected into the web bundle. |

## GitHub Deployments

For deployed instances managed through GitHub Actions, store the full deployed YAML as one GitHub Environment secret named `COMPASS_YAML`. Keep SSH and Docker Hub credentials as separate workflow secrets.

After adding `COMPASS_YAML`, remove old app config vars/secrets such as `BASEURL`, `CORS`, `FRONTEND_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `MONGO_URI`, `SUPERTOKENS_*`, `TOKEN_*`, `POSTHOG_*`, and `COMPASS_VERSION`.
