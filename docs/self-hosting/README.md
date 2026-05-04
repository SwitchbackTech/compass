# Self-Hosting

Self-hosting Compass means running it on a server you control instead of using `app.compasscalendar.com`.

Start with [Run Compass on a server](./server-guide.md). It walks through a small VPS setup with your own domain, HTTPS, and the Compass services running behind Caddy.

If you only want to run Compass on your own computer, use the normal local development flow with Bun instead of the self-host installer. See [Run Compass without the installer](./advanced-manual.md).

## What Compass is made of

When you self-host Compass on a server, you get a stack of small services. Only the public website and API are reachable from your browser. The databases stay private inside Docker.

```mermaid
flowchart TD
    browser[Your browser]
    indexeddb[(Browser IndexedDB<br/>tasks)]
    caddy[Caddy<br/>HTTPS]
    web[web container<br/>127.0.0.1:9080]
    backend[backend container<br/>127.0.0.1:3000/api]
    mongo[(MongoDB<br/>events)]
    supertokens[SuperTokens Core<br/>signup, login]
    postgres[(Postgres<br/>auth data)]

    browser -->|loads Compass| caddy
    caddy -->|web traffic| web
    caddy -->|API traffic| backend
    browser -->|stores tasks locally| indexeddb
    backend -->|Docker volume| mongo
    backend --> supertokens
    supertokens -->|Docker volume| postgres
```

## Start here

- New self-host install: [Run Compass on a server](./server-guide.md)
- Backups and restore: [Back up and restore your data](./backups-and-restore.md)
- Google Calendar: [Add Google Calendar](./google-calendar.md)
- Manual Bun setup: [Run Compass without the installer](./advanced-manual.md)

## What you still need to handle yourself

These docs keep the default self-host path focused on a small server. They do not set up:

- a built-in backup scheduler
- an automatic restore flow
- a rollback command for `./compass update`
- Docker backups for browser IndexedDB data
- automatic Google Calendar watch maintenance (see [Google Calendar](./google-calendar.md))

Have an idea on how we can make self-hosting easier? Let us know in [this GitHub Discussion](https://github.com/SwitchbackTech/compass/discussions/1694).
