# Server Hosting Status

This is not a supported beginner server-hosting guide yet.

The path supported by these docs is local Docker self-hosting on one computer. Public server hosting needs more runtime work and testing before the docs should present it as a copy-paste path.

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

Do not work around that by exposing Docker database ports or copying random reverse-proxy snippets into production. The public server path needs explicit auth-domain, HTTPS, proxy, backup, and restore testing first.
