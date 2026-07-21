# Event migration runbook (sub-calendar v1) — moved

The sub-calendar v1 cutover migration (legacy `event` collection to the
calendar-owned schema) shipped in releases up to **v1.0.310**. The migration
code and this runbook were removed from later releases once Compass-operated
production and staging completed the cutover (2026-07-15).

**If your install still runs the pre-cutover event schema** (you have never
performed the write-pause-and-rename cutover, or `mongosh` shows no
`event_legacy_v1` collection and your app version predates v1.0.236):

1. Upgrade to
   [v1.0.310](https://github.com/SwitchbackTech/compass-calendar/tree/v1.0.310)
   first — do not jump straight to a later release.
2. Follow that version's
   [event migration runbook](https://github.com/SwitchbackTech/compass-calendar/blob/v1.0.310/docs/self-hosting/event-migration-runbook.md)
   and the cutover section of its
   [backup & restore guide](https://github.com/SwitchbackTech/compass-calendar/blob/v1.0.310/docs/self-hosting/backup-and-restore.md)
   in full.
3. Once the cutover is verified, upgrade to the latest release as a
   [normal upgrade](./upgrades.md) and run any remaining pending migrations.

If your install already cut over (or was first installed after v1.0.236),
nothing here applies — upgrade normally.
