# Remote prod preseed

Run Sync `preseed-sync --apply` on the production host (or another always-on box), **not** a laptop Cursor session.

## Single-runner rule

Only one `--apply` may target a given Sync Mongo database at a time. Do not start a second apply from a laptop while the host job is running.

## Setup on prod host

```bash
# clone or rsync the branch with preseed fixes
git clone git@github.com:SwitchbackTech/compass-calendar.git /root/compass-preseed
cd /root/compass-preseed && git checkout <branch> && bun install

export COMPASS_CONFIG_FILE=/root/compass/compass.yaml
export PRESEED_OUT=/root/sync-preseed-prod/apply
export PRESEED_DISCORD_WEBHOOK_URL='…'   # optional; falls back to DISCORD_DEPLOY_WEBHOOK_URL
# or: export DISCORD_DEPLOY_WEBHOOK_URL='…'

chmod +x packages/scripts/preseed-remote/*.sh
tmux new -s preseed 'packages/scripts/preseed-remote/run-preseed.sh'
```

Install the 5-minute watchdog (writes `$PRESEED_OUT/watchdog.log`; Discord when webhook set):

```cron
*/5 * * * * PRESEED_OUT=/root/sync-preseed-prod/apply PRESEED_DISCORD_WEBHOOK_URL=… /root/compass-preseed/packages/scripts/preseed-remote/preseed-watchdog.sh >>/root/sync-preseed-prod/apply/watchdog-cron.log 2>&1
```

## Ops

- Heartbeat: `$PRESEED_OUT/heartbeat.json` (refreshed during state migrate)
- Success: `$PRESEED_OUT/SUCCESS.json`
- Failure: `$PRESEED_OUT/failure.json`
- Stop: `tmux attach -t preseed` then Ctrl-C, or `kill $(cat $PRESEED_OUT/preseed.pid)`
- Resume: rerun `run-preseed.sh` (idempotent upserts; corrupt Sync events are purged at start)

## Flags

`run-preseed.sh` uses `--reproject after` and `--concurrency 4` by default (`PRESEED_REPROJECT`, `PRESEED_CONCURRENCY`).
