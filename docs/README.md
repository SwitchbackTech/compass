# Docs

Internal documentation for engineers and agents working in the Compass repo.

Start with [AGENTS.md](../AGENTS.md) for repo rules and command defaults. Use this index for codebase shape, subsystem behavior, and acceptance runbooks.

## Start Here

- [Repo Architecture](./architecture/repo-architecture.md)
- [Feature File Map](./development/feature-file-map.md)
- [Common Change Recipes](./development/common-change-recipes.md)

## Common Change Paths

- Auth or session behavior: [Frontend Runtime Flow](./frontend/frontend-runtime-flow.md), [Password Auth Flow](./features/password-auth-flow.md), [Google Sync And SSE Flow](./features/google-sync-and-sse-flow.md)
- Event shape or recurrence behavior: [Event And Task Domain Model](./architecture/event-and-task-domain-model.md), [Recurrence Handling](./features/recurring-events-handling.md)
- Local-first or storage behavior: [Offline Storage And Migrations](./features/offline-storage-and-migrations.md)
- Backend routes and API behavior: [Backend Route Map](./backend/README.md), [Backend Request Flow](./backend/backend-request-flow.md), [Backend Error Handling](./backend/backend-error-handling.md)

## Runtime Flows

- [Frontend Runtime Flow](./frontend/frontend-runtime-flow.md)
- [Google Sync And SSE Flow](./features/google-sync-and-sse-flow.md)
- [Password Auth Flow](./features/password-auth-flow.md)

## Architecture And Domain

- [Repo Architecture](./architecture/repo-architecture.md)
- [Event And Task Domain Model](./architecture/event-and-task-domain-model.md)
- [Glossary](./architecture/glossary.md)

## Development And Operations

- [Local Development](./development/local-development.md)
- [Hosting Modes](./development/hosting-modes.md)
- [Self-Hosting](./self-hosting/README.md)
- [Testing Playbook](./development/testing-playbook.md)
- [Types And Validation](./development/types-and-validation.md)
- [CLI And Maintenance Commands](./development/cli-and-maintenance-commands.md)
- [Deploy](./development/deploy.md)

## Feature Deep Dives

- [Password Auth Flow](./features/password-auth-flow.md)
- [Google Sync And SSE Flow](./features/google-sync-and-sse-flow.md)
- [Recurrence Handling](./features/recurring-events-handling.md)
- [Offline Storage And Migrations](./features/offline-storage-and-migrations.md)

## Acceptance

User-visible behavior runbooks for manual verification and expected outcomes:

- [Auth](./acceptance/auth.md)
- [Events](./acceptance/events.md)
- [Google Sync](./acceptance/google-sync.md)
- [Recurring Events](./acceptance/recurring-events.md)
- [Shortcuts](./acceptance/shortcuts.md)
- [Tasks](./acceptance/tasks.md)
