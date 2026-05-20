# Custom code guide

We deploy our code to DockerHub so it's easy to pull them down during updates without manually rebuilding. This guide is for those who want to run their own Compass code in their selfhosted environment.

> **Warning: back up before every update.** `./compass update` rebuilds with newer code. There is no rollback. Back up `~/compass/compass.yaml`, the Mongo volumes, and the SuperTokens Postgres volume **together**. See [Backups and restore](./backup-and-restore.md).

Then:

```bash
cd ~/compass
./compass update
```

## Customizing web code

There are a few scenarios when you'll need to customize things:

- When you want to change the API URL used by the browser
- When you want to enable Google OAuth

These values are baked into the web bundle, so they require a rebuild.

If you need one of those values to differ from the published image, build and push a custom `compass-web` image, then set `web.image` in `compass.yaml` to the
tag you pushed:

```yaml
web:
  image: your-registry/compass-web:your-tag
  url: https://compass.example.com
```

The `compass` script exports `web.image` as `COMPASS_WEB_IMAGE` and Docker Compose uses it automatically. Run `./compass restart` after updating the field.
