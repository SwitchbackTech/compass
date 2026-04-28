# Self-Hosting Compass

This page helps you choose the right self-hosting guide for personal use.

The supported self-host path in this repo today is **local Docker self-hosting**: Compass runs on your own computer, the web app is available at `http://localhost:9080`, and the backend API is available at `http://localhost:3000/api`.

You can self-host Compass with only email/password signup. You do not need Google Calendar to use Compass locally.

## Choose A Guide

| Guide | Use it when |
| --- | --- |
| [Local Quickstart](./self-hosting/local-quickstart.md) | You want the recommended local Docker install on your own Mac or Linux machine. |
| [Backups And Restore](./self-hosting/backups-and-restore.md) | You want to preserve or restore signed-in event data and auth data. |
| [Google Calendar](./self-hosting/google-calendar.md) | You want to understand no-Google mode, optional local Google OAuth/import, or public HTTPS Google watch notifications. |
| [Advanced Manual Setup](./self-hosting/advanced-manual.md) | You want to run the pieces yourself instead of using the installer. |
| [Server Hosting Guide](./self-hosting/server-guide.md) | You want the best current one-domain server shape, with limitations called out. |

## What The Local Installer Actually Does

The installer is a local Docker installer, not a general public-server installer.

It creates `~/compass`, writes generated secrets to `~/compass/.env`, copies the helper command to `~/compass/compass`, and starts a Docker Compose stack.

The local stack exposes only:

- Web app: `http://localhost:9080`
- Backend API: `http://localhost:3000/api`

The compose file binds those two ports to `127.0.0.1`, so they are intended for the same computer only. MongoDB, SuperTokens Core, and the SuperTokens Postgres database stay on Docker's internal network.

## Important Data Warning

Keep `~/compass/.env`.

That file contains generated passwords and tokens used by the existing Docker volumes. If the Docker volumes remain on your machine but `~/compass/.env` is lost, a new `.env` can generate different database credentials and lock you out of the old data.

Before running `./compass update`, make a backup of:

- `~/compass/.env`
- the Mongo Docker volume
- the SuperTokens Postgres Docker volume

Docker volume backups do **not** back up browser IndexedDB data. That includes tasks and anonymous or pre-signup local data.

`./compass update` pulls newer Compass code and rebuilds the stack. It is not a rollback tool.

## What Is Not Promised Here

These docs intentionally do not claim support that has not been verified:

- no beginner public-server hosting guide yet
- no end-to-end verified public-domain SuperTokens setup yet
- no built-in HTTPS certificate or reverse proxy setup
- no built-in backup scheduler
- no automatic restore flow
- no rollback command for `./compass update`
- no Docker backup for browser IndexedDB data
- no continuous Google Calendar sync on the local-only install

Google Calendar is optional. See [Google Calendar](./self-hosting/google-calendar.md) for the difference between no-Google mode, local Google OAuth/import, and public HTTPS watch notifications.

## Quick Install

If you are ready to use the local Docker path:

```bash
curl -fsSL https://raw.githubusercontent.com/SwitchbackTech/compass/main/self-host/install.sh | sh
```

For the full local guide, read [Local Quickstart](./self-hosting/local-quickstart.md).
