# Server Hosting Status

Compass does not yet have a verified beginner server-hosting guide.

The local Docker installer is still the supported path. It runs Compass on the same machine at `localhost` and is designed for personal local use.

Server authentication should now be configurable, but server hosting should not be documented as a copy-paste setup until it has been tested on a real HTTPS domain.

## Current Status

The backend CORS middleware reads configured origins from `CORS`.

The SuperTokens setup in `packages/backend/src/common/middleware/supertokens.middleware.ts` now derives its domains from the configured URLs:

- API domain: origin of `BASEURL`
- website domain: origin of `FRONTEND_URL`

The SuperTokens CORS helper also uses the configured `CORS` origins, with a fallback to the `FRONTEND_URL` origin.

For a one-domain server setup, the expected values would look like:

```bash
BASEURL=https://compass.example.com/api
FRONTEND_URL=https://compass.example.com
CORS=https://compass.example.com
```

That removes the known localhost-only auth configuration issue, but it has not been verified end-to-end on a real public domain yet. Until that happens, these docs should not claim that public-domain signup, login, password reset, sessions, or Google auth work on a server.

## Target Shape, Not Yet Verified

If public server hosting is supported later, use one coherent path instead of several half-documented options:

- Ubuntu VPS
- Docker Compose
- Caddy for HTTPS
- one public domain, for example `https://compass.example.com`
- proxy `/api/*` to the backend
- proxy all other paths to the web app
- keep MongoDB, SuperTokens Core, and Postgres private to the server or Docker network

Start with one domain first:

- Frontend: `https://compass.example.com`
- Backend: `https://compass.example.com/api`

That avoids extra cross-site cookie complexity. A separate domain such as `https://api.compass.example.com` can be supported later, but it is a harder beginner path.

That path still needs implementation and verification before it becomes a beginner guide.

## Do Not Use The Local Installer As A Public Server Installer

The local installer binds web and backend ports to `127.0.0.1`. That is good for personal local use, but it is not a public server setup.

Avoid exposing MongoDB, SuperTokens, or Postgres to the public internet. A safe server setup should keep those services private and expose only the web app and API through HTTPS.
