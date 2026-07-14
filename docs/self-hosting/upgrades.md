# Upgrades

How to upgrade a self-hosted Compass install: normal image updates, when a
database migration is involved, and the one-time sub-calendar v1 cutover.

**Back up first, every time.** See [Back up & restore](./backup-and-restore.md)
— `./compass update` and `./compass rebuild` don't snapshot your data or your
old app version, so a bad upgrade has no automatic rollback otherwise.

## Normal upgrades (published images)

Most upgrades are a pull-and-restart of the published DockerHub images:

```bash
cd ~/compass
./compass update
```

This runs `docker compose pull` then `docker compose up -d` and waits for
the backend health check. It does not touch your data volumes, and it does
not run database migrations (see below) — it only replaces the running
containers with newer images at whatever version `compass.yaml` points at.

## Upgrades from your own source checkout

If you run [custom code](./customizing.md) — your own fork, or values baked
into the web bundle at build time — update your git checkout and rebuild
locally instead of pulling published images:

```bash
git pull
cd ~/compass
./compass rebuild
```

`./compass rebuild` builds images locally with Docker instead of pulling
them. It requires the build blocks in `compose.yaml` to be uncommented and
the full repo checkout present alongside it — see the [Custom code
guide](./customizing.md). It restarts and health-checks the same way
`update` does.

## When you need to run a migration manually

Migrations **never run automatically** on deploy — neither `./compass
update`, `./compass rebuild`, nor the backend container's own startup (its
entrypoint is the app server, nothing else) invokes the migration runner. If
a release adds one, you run it yourself; check the release notes for
whether it belongs before or after the image update.

```bash
bun run cli migrate pending   # check what's pending
bun run cli migrate up        # run everything pending
```

Both live in `packages/scripts`. The runner reads its Mongo connection from
your config file — set `COMPASS_CONFIG_FILE=~/compass/compass.yaml` outside
the dev repo — and needs to run from a machine or container that can reach
the compose network, since Docker installs don't publish the Mongo port to
the host.

Back up before running any migration; see [Back up &
restore](./backup-and-restore.md). Migrations here are written to be
additive and non-destructive (`packages/scripts/src/migrations/`), but the
backup is still the only rollback if one behaves unexpectedly.

One current migration is cleanup rather than additive: `priority-data-cleanup`
(`2026.07.14T10.00.00`) removes the now-dead `priority` field left over from
the removed priority-tagging feature and drops its orphaned collection. It's
routine (no cutover, no coordination with the sub-calendar v1 work below) —
run it like any other pending migration; see [Event migration
runbook](./event-migration-runbook.md#notes) for detail.

## The sub-calendar v1 cutover (one-time, special-cased)

One upgrade is not a normal image update: the sub-calendar v1 release moves
events out of the legacy `event` collection into a calendar-owned schema
behind a one-time collection rename — a short write pause, not a rolling
migration. Do not treat it like a routine `./compass update`.

Follow, in order:

1. [Event migration runbook](./event-migration-runbook.md) — how to run and
   verify the forward migration ahead of time. Running it early is safe; it
   does not activate the new schema on its own.
2. [Back up & restore: Sub-calendar v1 collection
   cutover](./backup-and-restore.md) — the exact backup, cutover-rename, and
   rollback commands, plus the loss window a rollback accepts.

This procedure must be rehearsed on staging before it is ever run against
production. Production cuts over exactly once, manually, only after every
gate in the `09` release-hardening plan passes on staging.

## What to read next

[Server hosting guide](./server-guide.md) (initial setup),
[Monitoring](./monitoring.md) (what to watch after an upgrade), and [Google
Calendar](./google-calendar.md) (if the upgrade touches Google sync
configuration).

----

Have an idea on how we can make self-hosting easier? Let us know in [this GitHub Discussion](https://github.com/SwitchbackTech/compass/discussions/1694).
