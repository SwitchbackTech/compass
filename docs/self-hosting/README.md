# Self-Hosting

You can run Compass on infrastructure you control instead of using the hosted version on `compasscalendar.com`

Start with [Run Compass on a server](./server-guide.md). It walks through a small VPS setup with your own domain, HTTPS, and the Compass services running behind a reverse proxy.

If you only want to run Compass on your own computer, use the normal local development flow with Bun instead of the self-host installer.

Self-host does not require Stripe. Omit the `stripe:` block so billing stays off and every account remains writable. Hosted Compass uses a 7-day trial then $8/month; see [Billing And Trial](../features/billing.md).

## Compass architecture

When you self-host Compass on a server, you get a stack of small services. Only the public website and API are reachable from your browser. The databases stay private inside Docker.

```mermaid
flowchart TD
    browser[Your browser]
    indexeddb[(Browser IndexedDB<br/>offline events)]
    caddy[Caddy<br/>HTTPS]
    web[web container<br/>127.0.0.1:9080]
    backend[backend container<br/>127.0.0.1:3000/api]
    sync[sync container<br/>127.0.0.1:3010]
    mongo[(MongoDB<br/>prod_calendar + compass_sync)]
    supertokens[SuperTokens Core<br/>signup, login]
    postgres[(Postgres<br/>auth data)]
    google[Google Calendar]

    browser -->|loads Compass| caddy
    caddy -->|web traffic| web
    caddy -->|API traffic| backend
    caddy -->|/sync/* OAuth + webhooks| sync
    browser -->|caches events locally| indexeddb
    backend -->|Docker volume| mongo
    backend -->|calendar/event reads + writes| sync
    backend --> supertokens
    sync -->|Docker volume, own database| mongo
    sync <-->|OAuth, push notifications| google
    supertokens -->|Docker volume| postgres
```

Compass Sync owns Google Calendar sync end to end (OAuth, webhooks, and incremental pulls) in its own isolated database on the same bundled MongoDB — the backend never reads Google credentials directly. Sign-in with Google is the one exception: it stays a direct backend↔Google exchange, separate from calendar sync.

## Start here

Ready to get this setup on your infrastructure? See [Run Compass on a server](./server-guide.md)

----

Have an idea on how we can make self-hosting easier? Let us know in [this GitHub Discussion](https://github.com/SwitchbackTech/compass/discussions/1694).
