# CI/CD

Compass uses GitHub Actions for continuous integration, Docker Hub for image distribution, and a VPS for staging.

## Workflows

| Workflow | Trigger | Purpose |
|---|---|---|
| Test | Push / PR to `main` | Runs lint, type-check, and unit tests |
| CodeQL | Push / PR to `main` | Static security analysis |
| Bump version and tag | Push to `main` | Auto-increments patch version, pushes a new semver tag |
| Publish Docker images | Push a `v*.*.*` tag | Builds images, pushes to Docker Hub, deploys to staging |
| Sync docs to compass-docs | Push to `main` touching `docs/**` | Mirrors this `docs/` directory to docs.compasscalendar.com |

---

## Release Flow

Every PR merge to `main` triggers a fully automated chain:

```
PR merged to main
  └─► bump-and-tag.yml        — reads latest tag, pushes v1.2.X+1
        └─► publish-images.yml — builds & pushes images to Docker Hub
              └─► deploy-staging  — SSHes into VPS, runs ./compass update
```

**Monthly minor/major releases** remain manual: a maintainer pushes a tag like `v1.3.0` or `v2.0.0`, which skips the bump step and goes straight to publish + deploy.

### Removing a test tag

```sh
git push origin --delete v1.2.3
git tag -d v1.2.3
```

---

## Publish Docker Images

Source: [`.github/workflows/publish-images.yml`](../../.github/workflows/publish-images.yml)

### How it works

1. A semver tag matching `v[0-9]+.[0-9]+.[0-9]+` is pushed (either by `bump-and-tag.yml` or manually).
2. The workflow strips the `v` prefix and derives two tag aliases:
   - `1.2.3` — exact patch version
   - `1.2` — floating minor alias
3. It builds and pushes three images to Docker Hub:
   - `switchbacktech/compass-backend`
   - `switchbacktech/compass-mongo`
   - `switchbacktech/compass-web`
4. Each image gets all three tags: `1.2.3`, `1.2`, and `latest`.
5. After all images are pushed, the `deploy-staging` job runs.

### Tag pattern rules

Only clean semver tags trigger the workflow. Tags with suffixes (e.g. `v1.2.3-test`) do not match and are safe to push for local testing without triggering a deploy.

### Web image build-args

`BASEURL` and `GOOGLE_CLIENT_ID` are baked into the web bundle at compile time. The published image ships with localhost defaults. Users who need a custom API domain or real Google credentials must rebuild the web image locally using the commented-out `build:` blocks in `docker-compose.yml`.

---

## Staging Deploy

Source: `deploy-staging` job in [`.github/workflows/publish-images.yml`](../../.github/workflows/publish-images.yml)

The deploy job SSHes into the staging VPS and runs `./compass update`, which pulls the latest Docker Hub images and restarts the stack. This mirrors exactly what self-hosters do to update their installations — intentionally, so we catch any issues early.

### One-time VPS setup

These steps run once by a maintainer. After this, all deploys are automated.

1. **Provision** a VPS and SSH in as root
2. **Install Docker**: follow [docs.docker.com/engine/install](https://docs.docker.com/engine/install/)
3. **Run the Compass installer**:

   ```sh
   curl -fsSL https://raw.githubusercontent.com/SwitchbackTech/compass/main/self-host/install.sh | sh
   ```

4. **Edit `~/compass/.env`** — set staging-specific values (domain, Google OAuth creds, secrets)
5. **Generate a deploy SSH keypair** (run locally, not on the VPS):

   ```sh
   ssh-keygen -t ed25519 -C "compass-staging-deploy" -f compass-staging-deploy
   ```

6. **Add the public key** to `~/.ssh/authorized_keys` on the VPS:

   ```sh
   ssh-copy-id -i compass-staging-deploy.pub <user>@<vps-ip>
   ```

7. **Add the private key** as `STAGING_SSH_KEY` in GitHub secrets (see table below)

### Required secrets

All secrets go in **GitHub → Settings → Secrets and variables → Actions**:

| Secret | Value |
|---|---|
| `DOCKERHUB_USERNAME` | Docker Hub username for the `switchbacktech` org |
| `DOCKERHUB_TOKEN` | Docker Hub personal access token (Read & Write) |
| `STAGING_SSH_HOST` | VPS IP address or hostname |
| `STAGING_SSH_USER` | Linux user on the VPS that owns `~/compass` |
| `STAGING_SSH_KEY` | Private key from the deploy keypair (the `compass-staging-deploy` file, not `.pub`) |
