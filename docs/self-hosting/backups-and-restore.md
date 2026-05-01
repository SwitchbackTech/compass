# Back up and restore your data

For the Docker install created by `self-host/install.sh` on your server. Backups are manual today. The installer and `./compass update` do not create them for you.

## Why this matters

> **Warning.** If you run `./compass update` without a backup and something goes wrong, there is no rollback. The update command rebuilds Compass with newer code. It does not snapshot your old data or your old app version.
>
> If `~/compass/.env` is lost while the Docker volumes still exist, a new install generates fresh database passwords that won't match the old volumes. You'll be locked out of your existing events and accounts.

Your three things to keep, **together as a set**:

1. `~/compass/.env`
2. the Mongo Docker volume (events)
3. the SuperTokens Postgres Docker volume (accounts and sessions)

## Keep `.env` with your data

`~/compass/.env` holds the generated passwords and tokens that match your
Docker volumes. If the volumes stay but `.env` is gone, a new install creates
different credentials and can lock you out of the old data.

Before `./compass update` or anything that touches the install, back up
`~/compass/.env`, the Mongo volume, and the SuperTokens Postgres volume together.
They're a set.

## What's not in a Docker backup

Browser IndexedDB data is not included in Docker volume backups. That means:

- tasks, which live in your browser and not in Mongo
- anonymous events created before signup
- any pre-signup local data not yet copied to the backend

There's no repo-supported export for browser-only data yet.

## Find your volume names

The default install creates:

- `compass_compass_mongo_data`
- `compass_compass_supertokens_postgres_data`

If you set a custom `COMPOSE_PROJECT_NAME` at install time, the volume names use that prefix instead of `compass`. To list the Compass volumes on your machine:

```bash
docker volume ls | grep compass
```

The commands below assume the default names. Replace them if yours differ.

## Make a backup

From `~/compass`:

```bash
cd ~/compass
BACKUP_DIR="$HOME/compass-backups/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

./compass stop

cp -p .env "$BACKUP_DIR/compass.env"

docker run --rm \
  -v compass_compass_mongo_data:/volume \
  -v "$BACKUP_DIR":/backup \
  alpine \
  sh -c 'cd /volume && tar czf /backup/mongo-volume.tgz .'

docker run --rm \
  -v compass_compass_supertokens_postgres_data:/volume \
  -v "$BACKUP_DIR":/backup \
  alpine \
  sh -c 'cd /volume && tar czf /backup/supertokens-postgres-volume.tgz .'

./compass start
```

Backups land in `~/compass-backups`, outside `~/compass`, so they survive if you ever delete the install folder. Keep the whole timestamped folder together. The `.env` file and the two volume archives are useless apart.

## Restore a backup

> **Warning: restore replaces existing data.** The commands below wipe both Docker volumes and overwrite `.env`. Only run them on an install you're willing to replace.

Set `BACKUP_DIR` to the folder you created during backup:

```bash
cd ~/compass
BACKUP_DIR="$HOME/compass-backups/YYYYMMDD-HHMMSS"

# Only continue if these three files are from the backup you want to restore.
ls -lh "$BACKUP_DIR/compass.env" \
  "$BACKUP_DIR/mongo-volume.tgz" \
  "$BACKUP_DIR/supertokens-postgres-volume.tgz"

./compass stop

cp -p "$BACKUP_DIR/compass.env" .env

docker run --rm \
  -v compass_compass_mongo_data:/volume \
  alpine \
  sh -c 'find /volume -mindepth 1 -maxdepth 1 -exec rm -rf {} +'

docker run --rm \
  -v compass_compass_mongo_data:/volume \
  -v "$BACKUP_DIR":/backup \
  alpine \
  sh -c 'cd /volume && tar xzf /backup/mongo-volume.tgz'

docker run --rm \
  -v compass_compass_supertokens_postgres_data:/volume \
  alpine \
  sh -c 'find /volume -mindepth 1 -maxdepth 1 -exec rm -rf {} +'

docker run --rm \
  -v compass_compass_supertokens_postgres_data:/volume \
  -v "$BACKUP_DIR":/backup \
  alpine \
  sh -c 'cd /volume && tar xzf /backup/supertokens-postgres-volume.tgz'

./compass start
```

## Verify the restore

```bash
cd ~/compass
./compass status
```

Then open Compass and check:

- you can sign in with the same account
- your events are present
- the backend health check responds: `http://localhost:3000/api/health`

If sign-in fails, the most likely cause is a `.env` and volume pair from different backups. Restore the matching `.env` from the same backup folder as the volumes.

## If `.env` is missing but old volumes exist

The installer stops in this case on purpose. A fresh `.env` would have new credentials that don't match the old volumes.

To keep the old data, restore the matching `.env` from a backup, then rerun the installer.

## What to read next

After you have a backup you trust, return to [Server hosting guide](./server-guide.md) for server checks and update notes.
