# Docs

Internal documentation for engineers and agents working in the Compass repo.

Start with [AGENTS.md](../AGENTS.md) for repo rules, commands, and conventions. Use the docs below for codebase shape and subsystem behavior.

## Start Here

- [Agent Onboarding](./development/agent-onboarding.md)
- [Repo Architecture](./architecture/repo-architecture.md)
- [Feature File Map](./development/feature-file-map.md)
- [Common Change Recipes](./development/common-change-recipes.md)

## Common Change Paths

- Auth or session behavior:
  [Frontend Runtime Flow](./frontend/frontend-runtime-flow.md),
  [Password Auth Flow](./features/password-auth-flow.md),
  [Google Sync And SSE Flow](./features/google-sync-and-sse-flow.md)
- Event shape or recurrence behavior:
  [Event And Task Domain Model](./architecture/event-and-task-domain-model.md),
  [Recurrence Handling](./features/recurring-events-handling.md)
- Local-first or storage behavior:
  [Offline Storage And Migrations](./features/offline-storage-and-migrations.md)
- Backend routes and API behavior:
  [Backend Request Flow](./backend/backend-request-flow.md),
  [API Documentation](./backend/api-documentation.md),
  [Backend Error Handling](./backend/backend-error-handling.md)

## Runtime Flows

- [Frontend Runtime Flow](./frontend/frontend-runtime-flow.md)
- [Google Sync And SSE Flow](./features/google-sync-and-sse-flow.md)
- [Password Auth Flow](./features/password-auth-flow.md)

## Architecture And Domain

- [Repo Architecture](./architecture/repo-architecture.md)
- [Event And Task Domain Model](./architecture/event-and-task-domain-model.md)
- [Glossary](./architecture/glossary.md)
- [Engineering Principles](./principles.md)

## Development And Operations

- [Env And Dev Modes](./development/env-and-dev-modes.md)
- [Testing Playbook](./development/testing-playbook.md)
- [Types And Validation](./development/types-and-validation.md)
- [CLI And Maintenance Commands](./development/cli-and-maintenance-commands.md)
- [Deploy](./development/deploy.md)
- [Coding Conventions](./development/coding-conventions.md)

## Feature Deep Dives

- [Password Auth Flow](./features/password-auth-flow.md)
- [Google Sync And SSE Flow](./features/google-sync-and-sse-flow.md)
- [Recurrence Handling](./features/recurring-events-handling.md)
- [Offline Storage And Migrations](./features/offline-storage-and-migrations.md)

## Requirements

Product requirements and specifications for each feature area:

- [Auth](./requirements/auth.md)
- [Events](./requirements/events.md)
- [Google Sync](./requirements/google-sync.md)
- [Recurring Events](./requirements/recurring-events.md)
- [Shortcuts](./requirements/shortcuts.md)
- [Tasks](./requirements/tasks.md)
