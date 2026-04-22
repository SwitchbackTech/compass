# Compass Self-Host Runtime

This folder contains the local Docker Compose runtime used by the self-host installer.

For the full setup guide, see [docs/self-hosting.md](../docs/self-hosting.md).

## First Install

From the repo root:

```bash
sh self-host/install.sh
```

The public install command uses the same script from GitHub.

## Local Commands

After installation, go to the install folder:

```bash
cd ~/compass
```

Then use:

```bash
./compass start
./compass stop
./compass restart
./compass logs
./compass status
./compass update
./compass open
```

`./compass update` works for Git-based installs. For archive installs, rerun the installer from an interactive shell to refresh Compass.

## Data

The installer writes local config to `~/compass/.env`.

Compass app data and events are stored in MongoDB. SuperTokens auth data is stored in Postgres. Those Docker volumes are:

- `compass_compass_mongo_data`
- `compass_compass_supertokens_postgres_data`

Stopping Compass does not delete those volumes.

Browser-only task data is not stored in these Docker volumes.
