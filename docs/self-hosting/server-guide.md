# Server Hosting Status

Compass does not yet have a verified beginner server-hosting guide.

The local Docker installer is still the supported path. It runs Compass on the same machine at `localhost` and is designed for personal local use.

Server hosting should be possible with a small set of configuration changes, but it should not be documented as a copy-paste setup until authentication has been tested on a real HTTPS domain.

## Current Blocker

The backend SuperTokens setup currently hardcodes localhost domains in `packages/backend/src/common/middleware/supertokens.middleware.ts`:

- API domain: `http://localhost:3000`
- website domain: `http://localhost:9080`

Until that behavior is made configurable and verified with a real public domain, these docs should not claim that public-domain signup, login, or Google auth work on a server.

## Target Shape, Not Yet Verified

If public server hosting is supported later, use one coherent path instead of several half-documented options:

- Ubuntu VPS
- Docker Compose
- Caddy for HTTPS
- one public domain, for example `https://compass.example.com`
- proxy `/api/*` to the backend
- proxy all other paths to the web app
- keep MongoDB, SuperTokens Core, and Postgres private to the server or Docker network

That path still needs implementation and verification before it becomes a beginner guide.

## Do Not Use The Local Installer As A Public Server Installer

The local installer binds web and backend ports to `127.0.0.1`. That is good for personal local use, but it is not a public server setup.

Avoid exposing MongoDB, SuperTokens, or Postgres to the public internet. A safe server setup should keep those services private and expose only the web app and API through HTTPS.
