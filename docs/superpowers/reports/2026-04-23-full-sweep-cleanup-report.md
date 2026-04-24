# Full Sweep Cleanup Report

Date: 2026-04-23
Branch: `refactor/full-sweep-cleanup`

## What Changed

### Backend sync cleanup

The backend sync service was doing too many jobs in one place. I split it into smaller services with clearer ownership:

- Watch setup and teardown now lives in a dedicated watch service.
- Google notification handling now lives in a dedicated notification service.
- Full import, repair, restart, maintenance, and outbound Compass-to-Google sync work now live in focused runner modules.
- The original sync service is now mostly a small facade that delegates to those focused modules.
- The circular dependency between the Google import code and the sync service was removed by depending directly on the watch service where needed.

This keeps the public behavior the same while making the sync path easier to read, test, and change without touching unrelated sync concerns.

### Backend test coverage

I added focused tests for the newly separated sync pieces:

- Watch lifecycle behavior.
- Notification dispatch behavior.
- Full import runner behavior, including restart handling and watch setup.
- Sync service facade behavior.

I also moved older sync-service tests into the files that now own that behavior, so the tests follow the new structure instead of all clustering around the old oversized service.

### Web draft cleanup

The calendar draft hook also had several decisions embedded inline. I pulled out the parts that can be tested without React:

- Draft submit decisions now live in a small helper that decides whether to create, update, discard, or reopen the form.
- Draft drag and resize date logic now lives in movement helpers.
- New focused tests cover those helpers, including pending events, unchanged drafts, form reopen behavior, all-day drag formatting, midnight clamping, and invalid resize movement.

The hook is still responsible for dispatching actions and coordinating local state, but the pure decision logic is now much easier to understand and protect.

### Repo health

I fixed one formatter-only lint error in an existing backend test so the repo-wide lint command can pass again. Existing warnings remain, but they are non-blocking.

## What Was Verified

Passed:

- `bun run test:core`
- `bun run test:backend`
- `bun run test:web`
- `bun run lint`
- Focused backend sync tests during each backend phase
- Focused web draft helper tests during each web phase

Important note:

- `bun run type-check` does not currently pass on this repository, but the failures are not from the files changed in this branch. The command is compiling older test files, Bun-specific scripts, and web/test setup files with a root TypeScript config that does not match how those files actually run. I confirmed the failure is repo-wide and not introduced by this cleanup.

## Behavior Notes

This branch is intended to preserve behavior. The goal was to reduce risk by moving code into smaller modules and adding tests around the existing behavior, not to redesign sync or calendar editing.

No database schema changes were made. No migrations were added. No external API behavior was intentionally changed.

## Remaining Risk

The biggest remaining cleanup opportunity is the global type-check setup. It should probably become its own follow-up branch because it needs a deliberate decision about what gets type-checked:

- production backend/core/scripts code,
- Bun-only scripts,
- Jest backend tests,
- Bun web tests,
- and the web app itself.

Right now those worlds are mixed together under one command, which makes the command noisy and unreliable as a merge gate.

## Commits

- `584bfc0d docs(config): add full sweep cleanup plan`
- `6a71c296 refactor(backend): extract sync watch service`
- `cfb496c2 refactor(backend): extract sync notification handling`
- `6b3b4913 refactor(backend): split sync import runners`
- `938d12af refactor(web): extract draft submit decisions`
- `97839e0d refactor(web): extract draft movement helpers`
- `b24880bb style(backend): format gcal util test`
