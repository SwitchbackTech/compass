# Back up & restore

For the Docker install created by `self-host/install.sh` on your server. Backups
are manual today. The installer and `./compass update` do not create them for you.

## A word of caution

> **Warning.** If you run `./compass update` without a backup and something goes
> wrong, there is no rollback. The update command pulls newer images and restarts
> Compass. It does not snapshot your old data or your old app version.
>
> If `~/compass/compass.yaml` is lost while the Docker volumes still exist, a new
> install generates fresh database passwords that won't match the old volumes.
> You'll be locked out of your existing events and accounts.

Keep these things together as one backup set:

1. `~/compass/compass.yaml`
2. the Mongo data Docker volume, which stores events
3. the Mongo config Docker volume, which stores Mongo replica set metadata
4. the SuperTokens Postgres Docker volume, which stores user sessions

The commands below stop Compass before copying raw Docker volumes. That keeps the
volume archives consistent.

## What's not in a Docker backup

Browser IndexedDB data is not included in Docker volume backups. That means:

- tasks, which live in your browser and not in Mongo
- anonymous events created before signup
- any pre-signup local data not yet copied to the backend

There's no repo-supported export for browser-only data yet.

## Before you start

SSH into the server and work from the Compass install directory:

```bash
cd ~/compass
PROJECT="$(basename "$PWD")"
```

For the default install, `PROJECT` is `compass` and the required volumes are:

- `compass_compass_mongo_data`
- `compass_compass_mongo_configdb`
- `compass_compass_supertokens_postgres_data`

If you installed Compass somewhere other than `~/compass`, the prefix changes to
that directory name. Confirm the volumes before backing up or restoring:

```bash
./compass status
docker volume ls | grep "${PROJECT}_compass_"
```

Do not continue unless those three data volumes exist.

## Make a backup

Run this from `~/compass`:

```bash
cd ~/compass
PROJECT="$(basename "$PWD")"
BACKUP_DIR="$HOME/compass-backups/$(date +%Y%m%d-%H%M%S)"

mkdir -p "$BACKUP_DIR"

./compass stop

cp -p compass.yaml "$BACKUP_DIR/compass.yaml"

docker run --rm \
  -v "${PROJECT}_compass_mongo_data":/volume:ro \
  -v "$BACKUP_DIR":/backup \
  alpine \
  sh -c 'cd /volume && tar czf /backup/mongo-data.tgz .'

docker run --rm \
  -v "${PROJECT}_compass_mongo_configdb":/volume:ro \
  -v "$BACKUP_DIR":/backup \
  alpine \
  sh -c 'cd /volume && tar czf /backup/mongo-configdb.tgz .'

docker run --rm \
  -v "${PROJECT}_compass_supertokens_postgres_data":/volume:ro \
  -v "$BACKUP_DIR":/backup \
  alpine \
  sh -c 'cd /volume && tar czf /backup/supertokens-postgres.tgz .'

{
  echo "created_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "project=$PROJECT"
  echo "install_dir=$PWD"
  echo "runtime_version=$(awk '/^[[:space:]]*version:/ { print $2; exit }' compass.yaml)"
  echo "files=compass.yaml,mongo-data.tgz,mongo-configdb.tgz,supertokens-postgres.tgz"
} > "$BACKUP_DIR/manifest.txt"

./compass start
```

Backups land in `~/compass-backups`, outside `~/compass`, so they survive if you
ever delete the install folder. Keep the whole timestamped folder together.
The config file and volume archives are a set.

## Verify the backup

Check that all expected files exist and that the archives are not empty:

```bash
ls -lh "$BACKUP_DIR"
test -s "$BACKUP_DIR/compass.yaml"
test -s "$BACKUP_DIR/mongo-data.tgz"
test -s "$BACKUP_DIR/mongo-configdb.tgz"
test -s "$BACKUP_DIR/supertokens-postgres.tgz"
test -s "$BACKUP_DIR/manifest.txt"
```

Inspect the archive contents:

```bash
tar tzf "$BACKUP_DIR/mongo-data.tgz" | head
tar tzf "$BACKUP_DIR/mongo-configdb.tgz" | head
tar tzf "$BACKUP_DIR/supertokens-postgres.tgz" | head
```

Then confirm Compass came back:

```bash
./compass status
curl -f http://localhost:3000/api/health
```

Open Compass and confirm you can still sign in and see your events.

## Restore to production

> **Warning: restore replaces existing data.** The commands below wipe the current
> Compass Docker volumes and overwrite `compass.yaml`. Only run them on an install
> you're willing to replace.

Set `BACKUP_DIR` to the backup folder you want to restore:

```bash
cd ~/compass
PROJECT="$(basename "$PWD")"
BACKUP_DIR="$HOME/compass-backups/YYYYMMDD-HHMMSS"

ls -lh "$BACKUP_DIR/compass.yaml" \
  "$BACKUP_DIR/mongo-data.tgz" \
  "$BACKUP_DIR/mongo-configdb.tgz" \
  "$BACKUP_DIR/supertokens-postgres.tgz" \
  "$BACKUP_DIR/manifest.txt"
```

Stop Compass, restore the config, empty each volume, and extract the backup:

```bash
./compass stop

cp -p "$BACKUP_DIR/compass.yaml" compass.yaml

docker run --rm \
  -v "${PROJECT}_compass_mongo_data":/volume \
  alpine \
  sh -c 'find /volume -mindepth 1 -maxdepth 1 -exec rm -rf {} +'

docker run --rm \
  -v "${PROJECT}_compass_mongo_data":/volume \
  -v "$BACKUP_DIR":/backup:ro \
  alpine \
  sh -c 'cd /volume && tar xzf /backup/mongo-data.tgz'

docker run --rm \
  -v "${PROJECT}_compass_mongo_configdb":/volume \
  alpine \
  sh -c 'find /volume -mindepth 1 -maxdepth 1 -exec rm -rf {} +'

docker run --rm \
  -v "${PROJECT}_compass_mongo_configdb":/volume \
  -v "$BACKUP_DIR":/backup:ro \
  alpine \
  sh -c 'cd /volume && tar xzf /backup/mongo-configdb.tgz'

docker run --rm \
  -v "${PROJECT}_compass_supertokens_postgres_data":/volume \
  alpine \
  sh -c 'find /volume -mindepth 1 -maxdepth 1 -exec rm -rf {} +'

docker run --rm \
  -v "${PROJECT}_compass_supertokens_postgres_data":/volume \
  -v "$BACKUP_DIR":/backup:ro \
  alpine \
  sh -c 'cd /volume && tar xzf /backup/supertokens-postgres.tgz'

./compass start
```

## Verify the production restore

First confirm the containers and backend health check:

```bash
cd ~/compass
./compass status
curl -f http://localhost:3000/api/health
```

Then open Compass and verify the restored data manually:

1. sign in with the same account you used before the backup
2. confirm your existing events are present
3. create a test event
4. edit the test event
5. delete the test event
6. restart Compass with `./compass restart`
7. sign in again and confirm your events are still present

If sign-in fails, the most likely cause is a `compass.yaml` and volume set from
different backups. Restore `compass.yaml` from the same timestamped folder as the
volume archives.

## Optional: rehearse a restore before touching production

The safest rehearsal is on a separate test server or VM with Docker installed.
Copy one timestamped backup folder to that machine, install Compass there, restore
the backup, and run the same manual checks. That proves the backup can be used
without risking your production install.

You can also do a same-server rehearsal in a separate temporary Compose project.
This verifies that the archives restore and the backend can start. Browser sign-in
may still use your production web bundle if your web image was built with a
production `backend.apiUrl`, so use a separate test server when you need a full
browser login rehearsal.

Run this from the production server:

```bash
BACKUP_DIR="$HOME/compass-backups/YYYYMMDD-HHMMSS"
CHECK_DIR="$HOME/compass-restore-check"
CHECK_PROJECT="$(basename "$CHECK_DIR")"

if [ -e "$CHECK_DIR" ]; then
  echo "$CHECK_DIR already exists. Move it aside before rehearsing a restore."
  exit 1
fi

for volume in \
  "${CHECK_PROJECT}_compass_mongo_data" \
  "${CHECK_PROJECT}_compass_mongo_configdb" \
  "${CHECK_PROJECT}_compass_supertokens_postgres_data"
do
  if docker volume inspect "$volume" >/dev/null 2>&1; then
    echo "Temporary restore volume already exists: $volume"
    exit 1
  fi
done

mkdir -p "$CHECK_DIR"
cp -p ~/compass/compose.yaml "$CHECK_DIR/compose.yaml"
cp -p ~/compass/compass "$CHECK_DIR/compass"
chmod +x "$CHECK_DIR/compass"
cp -p "$BACKUP_DIR/compass.yaml" "$CHECK_DIR/compass.yaml"

cd "$CHECK_DIR"

# Keep `backend.port` at 3000. The backend listens on that port inside the
# container; the temporary project only changes the host-side binding to 13000.
sed -i.bak \
  -e 's/^  port: 9080$/  port: 19080/' \
  -e 's#http://localhost:9080#http://localhost:19080#g' \
  -e 's#http://localhost:3000/api#http://localhost:13000/api#g' \
  compass.yaml

sed -i.bak \
  -e 's#127.0.0.1:${PORT:-3000}:3000#127.0.0.1:13000:3000#' \
  compose.yaml

docker volume create "${CHECK_PROJECT}_compass_mongo_data"
docker volume create "${CHECK_PROJECT}_compass_mongo_configdb"
docker volume create "${CHECK_PROJECT}_compass_supertokens_postgres_data"

docker run --rm \
  -v "${CHECK_PROJECT}_compass_mongo_data":/volume \
  -v "$BACKUP_DIR":/backup:ro \
  alpine \
  sh -c 'cd /volume && tar xzf /backup/mongo-data.tgz'

docker run --rm \
  -v "${CHECK_PROJECT}_compass_mongo_configdb":/volume \
  -v "$BACKUP_DIR":/backup:ro \
  alpine \
  sh -c 'cd /volume && tar xzf /backup/mongo-configdb.tgz'

docker run --rm \
  -v "${CHECK_PROJECT}_compass_supertokens_postgres_data":/volume \
  -v "$BACKUP_DIR":/backup:ro \
  alpine \
  sh -c 'cd /volume && tar xzf /backup/supertokens-postgres.tgz'

COMPASS_HEALTH_URL=http://localhost:13000/api/health ./compass start
curl -f http://localhost:13000/api/health
./compass status
```

When the rehearsal is done, remove only the temporary project:

```bash
cd "$CHECK_DIR"
./compass stop
COMPOSE_PROFILES=selfhosted docker compose \
  --project-name "$CHECK_PROJECT" \
  -f compose.yaml \
  down -v
cd ~
rm -rf "$CHECK_DIR"
```

Do not remove production volumes while cleaning up a rehearsal.

## If `compass.yaml` is missing but old volumes exist

The installer stops in this case on purpose. A fresh `compass.yaml` would have
new credentials that don't match the old volumes.

To keep the old data, restore the matching `compass.yaml` from a backup, then
rerun the installer.

## What to read next

After you have a backup you trust, return to [Server hosting guide](./server-guide.md)
for server checks and update notes.

----

Have an idea on how we can make self-hosting easier? Let us know in [this GitHub Discussion](https://github.com/SwitchbackTech/compass/discussions/1694).
