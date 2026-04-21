# Hosting Modes

Compass behaves differently depending on two things: **where the app is hosted**, and **whether the user has an account**. Together, those two choices decide what you need to set up, where data lives, and which subsystems are involved.

This guide is a map. When you want the detail behind a behavior, follow the links to the relevant subsystem doc.

## Why This Exists

The runtime mode affects:

- which services must be running
- which environment values are required
- where events, tasks, identity, and sessions are stored
- what you need to reproduce a bug
- how you debug auth and sync behavior

When you are debugging anything storage-, auth-, or sync-related, the first question is almost always: which hosting context and account state is the user in?

## Quick Matrix

| Hosting context | Account state | Calendar/event data location |
| ---------------- | ------------- | ---------------------------- |
| Compass Cloud (`app.compasscalendar.com`) | Anonymous | Browser IndexedDB |
| Compass Cloud (`app.compasscalendar.com`) | Signed in | Compass backend -> Compass MongoDB |
| Self-hosted | Anonymous | Browser IndexedDB |
| Self-hosted | Signed in | Operator backend -> configured MongoDB |

Tasks currently stay in IndexedDB in every mode. That will change once backend task persistence is added.

## Anonymous Browser State

The lightest state. Useful for trying Compass without creating an account.

- no account, no login
- events and tasks live in the browser's IndexedDB
- calendar and task data never leave the browser

This is the same story everywhere: on [app.compasscalendar.com](https://app.compasscalendar.com) and on a self-hosted install before the user signs up. The web app might be served from Compass Cloud or from a self-hosted server, but either way, anonymous calendar and task data stay in the browser.

## Self-Hosted Account Mode

The operator runs their own backend with their own infrastructure. This is the path that [docs/self-hosting.md](../self-hosting.md) walks through.

- operator runs the Compass backend
- signup and login go through SuperTokens (either operator-configured or a default local instance)
- on the first authenticated session, local events migrate from IndexedDB to the backend
- authenticated writes go to the operator's configured `MONGO_URI`
- Google Calendar is opt-in and uses the operator's own Google Cloud project

For the runtime env and required variables, see [Local Development](./local-development.md).

## Hosted Compass Cloud Account Mode

The signed-in state on the managed product at [app.compasscalendar.com](https://app.compasscalendar.com).

- Compass-operated backend
- Compass-owned MongoDB and SuperTokens configuration
- Compass production Google Cloud setup
- the end user does not run or configure any infrastructure

From the frontend's point of view, signed-in users here look the same as signed-in self-hosted users. The difference is on the other side: the backend they talk to is Compass-operated.

## Data Flow Summary

A quick read across hosting contexts and account states:

| State                        | Where writes go                                   |
| ---------------------------- | ------------------------------------------------- |
| Anonymous                    | Browser IndexedDB                                 |
| Signup / first login         | Local events sync up to the backend               |
| Authenticated (any mode)     | Backend → configured MongoDB                     |
| Google connect               | Backend stores Google credentials and starts sync |
| Google sync running          | Backend ⇄ Google Calendar, pushes updates to the browser via SSE |

For storage behavior and migration specifics, see [Offline Storage And Migrations](../features/offline-storage-and-migrations.md). For the Google side, see [Google Sync And SSE Flow](../features/google-sync-and-sse-flow.md).

## Common Confusions

A few things that trip up new contributors:

- **SuperTokens ≠ event storage.** SuperTokens stores identity and sessions. Compass events live in MongoDB (or IndexedDB when anonymous).
- **MongoDB stores events after signup, not before.** Anonymous events never touch the backend.
- **Google sync is independent from account mode.** Self-hosted account mode supports Google sync, but the backend still requires the Google env values at startup today. See [Local Development](./local-development.md) for the backend env contract.
- **Tasks stay local.** Tasks currently live in IndexedDB regardless of account state. Backend task persistence is not wired up yet.

## Deeper Docs

- [Password Auth Flow](../features/password-auth-flow.md)
- [Offline Storage And Migrations](../features/offline-storage-and-migrations.md)
- [Local Development](./local-development.md)
- [Deploy](./deploy.md)
- [Google Sync And SSE Flow](../features/google-sync-and-sse-flow.md)
- [API Documentation](../backend/api-documentation.md)
