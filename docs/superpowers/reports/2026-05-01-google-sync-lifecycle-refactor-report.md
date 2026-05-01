# Google Sync Lifecycle Refactor Report

## What Changed

Google sync is now organized around the actual product flows: Sync Channels,
Google sync lifecycle, Google event import/mirroring, and Draft Event
interaction.

The old all-purpose sync service was removed. Callers now use the module that
owns the behaviour they need.

## What Was Verified

- `bun run test:core`
- `bun run test:backend`
- `bun run test:web`
- `bun run type-check`
- `bun run lint`

## Behaviour Notes

The refactor is intended to preserve existing user-visible behaviour. The main
improvement is that Google sync errors, repairs, watch notifications, and draft
editing decisions are easier to understand and test.

## Remaining Risk

Google Calendar behaviour still depends on external Google APIs and public
webhook delivery. Local tests cover Compass decisions and recovery paths, but
production webhook delivery should still be checked before relying on continuous
sync.
