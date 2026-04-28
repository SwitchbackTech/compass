# Backups And Restore

This page covers the local Docker self-host install created by `self-host/install.sh`.

Backups are manual today. The installer and `./compass update` do not create a backup for you.

## What To Back Up

Back up all three of these together:

1. `~/compass/.env`
2. the Mongo Docker volume
3. the SuperTokens Postgres Docker volume

With the default install, the Docker volumes are:

- `compass_compass_mongo_data`
- `compass_compass_supertokens_postgres_data`

If you changed `COMPOSE_PROJECT_NAME`, the volume names use that project name instead of `compass`.

## What This Does Not Back Up

Docker volume backups do not back up browser IndexedDB data.

That means these are not included:

- tasks
- anonymous events before signup
- pre-signup local data that has not been copied to the backend yet

Those browser-only data types do not have a repo-supported export or backup command yet.

## Back Up Before Updating

Before running:

```bash
cd ~/compass
./compass update
```

make a backup.

`./compass update` pulls newer Compass code, rebuilds, and restarts the stack. It does not keep a rollback copy of your old data or old app version.

## Make A Backup

From the installed Compass folder:

```bash
cd ~/compass
backup_dir="$PWD/backups/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$backup_dir"

./compass stop

cp -p .env "$backup_dir/compass.env"

docker run --rm \
  -v compass_compass_mongo_data:/volume \
  -v "$backup_dir":/backup \
  alpine \
  sh -c 'cd /volume && tar czf /backup/mongo-volume.tgz .'

docker run --rm \
  -v compass_compass_supertokens_postgres_data:/volume \
  -v "$backup_dir":/backup \
  alpine \
  sh -c 'cd /volume && tar czf /backup/supertokens-postgres-volume.tgz .'

./compass start
```

Keep the whole backup folder together. The `.env` file and volume archives are a set.

If your volume names are different, replace the two `compass_...` volume names in the commands.

## Restore A Backup

Only restore onto a Compass install you are willing to replace.

Set `backup_dir` to the folder you created during backup:

```bash
cd ~/compass
backup_dir="$PWD/backups/YYYYMMDD-HHMMSS"

./compass stop

cp -p "$backup_dir/compass.env" .env

docker run --rm \
  -v compass_compass_mongo_data:/volume \
  alpine \
  sh -c 'find /volume -mindepth 1 -maxdepth 1 -exec rm -rf {} +'

docker run --rm \
  -v compass_compass_mongo_data:/volume \
  -v "$backup_dir":/backup \
  alpine \
  sh -c 'cd /volume && tar xzf /backup/mongo-volume.tgz'

docker run --rm \
  -v compass_compass_supertokens_postgres_data:/volume \
  alpine \
  sh -c 'find /volume -mindepth 1 -maxdepth 1 -exec rm -rf {} +'

docker run --rm \
  -v compass_compass_supertokens_postgres_data:/volume \
  -v "$backup_dir":/backup \
  alpine \
  sh -c 'cd /volume && tar xzf /backup/supertokens-postgres-volume.tgz'

./compass start
```

If your volume names are different, replace the two `compass_...` volume names in the commands before running them.

## Missing `.env` With Old Docker Volumes

If Docker volumes still exist but `~/compass/.env` is missing, the installer stops.

That is intentional. A fresh `.env` would contain new generated credentials, and those credentials may not match the old volumes.

To keep old data, restore the matching `.env` file first.
