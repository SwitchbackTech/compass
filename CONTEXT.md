# Context

Detailed source docs:

- `docs/README.md` - docs index
- `docs/architecture/glossary.md` - canonical glossary and domain language
- `docs/architecture/event-and-task-domain-model.md` - event and task shape
- `docs/features/recurring-events-handling.md` - recurrence behavior
- `docs/features/google-sync-and-sse-flow.md` - Google sync and realtime flow
- `docs/development/hosting-modes.md` - account, hosting, and storage modes
- `docs/self-hosting/README.md` - self-hosting story

## Project Rules

Google Calendar is optional.

- Missing Google credentials must not block Compass-local event writes.

When changing a shared event, sync, API, or error contract, keep the web,
  backend, and `core` package aligned.
