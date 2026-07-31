# Docs

Internal documentation for engineers and agents working in the Compass repo.

## Start Here

- [Development Quickstart](./development/quickstart.md)
- [Repo Architecture](./architecture/repo-architecture.md)
- [Feature File Map](./development/feature-file-map.md)
- [Common Change Recipes](./development/common-change-recipes.md)

## Common Change Paths

- Auth or session behavior: [Frontend Runtime Flow](./frontend/frontend-runtime-flow.md), [Password Auth Flow](./features/password-auth-flow.md), [Google Sync And SSE Flow](./features/google-sync-and-sse-flow.md)
- Event shape or recurrence behavior: [Event Domain Model](./architecture/event-domain-model.md), [Common Change Recipes](./development/common-change-recipes.md#change-recurring-event-behavior)
- Event caching, reads, or optimistic writes: [Event Caching](./frontend/event-caching.md)
- Dragging/resizing events on the week grid: [Week Drag Interaction](./frontend/week-drag-interaction.md)
- Breakpoints, sidebar collapse, or layout at different viewport sizes: [Responsive Layout](./frontend/responsive-layout.md)
- Local-first or storage behavior: [Offline Storage And Migrations](./features/offline-storage-and-migrations.md)
- Backend routes and API behavior: [Backend Route Map](./backend/README.md), [Backend Request Flow](./backend/backend-request-flow.md), [Backend Error Handling](./backend/backend-error-handling.md)
- A new calendar integration or Google-sync behavior: [Google Sync And SSE Flow](./features/google-sync-and-sse-flow.md), the `packages/sync` domain code directly

## Architecture And Domain

- [Repo Architecture](./architecture/repo-architecture.md)
- [Event Domain Model](./architecture/event-domain-model.md)
- [Glossary](./architecture/glossary.md)

## Development And Operations

- [Local Development](./development/local-development.md)
- [Troubleshooting](./development/troubleshoot.md)
- [Configuration](./Config/README.md)
- [Hosting Modes](./development/hosting-modes.md)
- [Self-Hosting](./self-hosting/README.md)
- [Testing Playbook](./development/testing-playbook.md)
- [Performance Baselines](./development/performance-baselines.md)
- [Types And Validation](./development/types-and-validation.md)
- [CI/CD Workflows](./CI-CD/workflows.md)
- [CLI And Maintenance Commands](./development/cli.md)
- [Versioning](./CI-CD/versioning.md)

## Acceptance

User-visible behavior runbooks for manual verification and expected outcomes:

- [Auth](./acceptance/auth.md)
- [Events](./acceptance/events.md)
- [Google Sync](./acceptance/google-sync.md)
- [Recurring Events](./acceptance/recurring-events.md)
- [Shortcuts](./acceptance/shortcuts.md)
