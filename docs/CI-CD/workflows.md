# Workflows

Compass uses GitHub Actions for continuous integration, Docker Hub for image distribution, and a VPS for staging.

| Workflow | Trigger | Purpose |
|---|---|---|
| Test | Push / PR to `main` | Runs lint, type-check, and unit tests |
| CodeQL | Push / PR to `main` | Static security analysis |
| Release on main | Push to `main` | Auto-increments patch version, publishes Docker images, then deploys staging |
| Publish Docker images | Reusable workflow / manual dispatch / manual `v*.*.*` tag push | Builds and pushes Docker images only |
| Deploy staging | Reusable workflow / manual dispatch | Pulls published images on staging and restarts the stack |
| Sync docs to compass-docs | Push to `main` touching `docs/**` | Mirrors this `docs/` directory to docs.compasscalendar.com |

---

## Release Flow

Every PR merge to `main` triggers a fully automated chain:

```
PR merged to main
  └─► release-on-main.yml
        ├─► tag-release             — reads latest tag, pushes v1.2.X+1
        ├─► publish-docker-images   — builds and pushes Docker Hub images
        └─► deploy-staging          — SSHes into VPS, runs ./compass update
```

The automatic path calls reusable workflows directly. It uses `GITHUB_TOKEN` to
push the git tag, then passes that tag to the publish and deploy workflows. It
does not rely on the workflow-created tag push to trigger another workflow.

**Monthly minor/major releases** remain manual: a maintainer pushes a tag like
`v1.3.0` or `v2.0.0`, which skips the bump step and runs
`Publish Docker images`. Staging deploys for manual tags are explicit: run
`Deploy staging` with the existing tag after the images are published.

### Removing a test tag

```sh
git push origin --delete v1.2.3
git tag -d v1.2.3
```

---

## Publish Docker Images

Source: [`.github/workflows/publish-docker-images.yml`](../../.github/workflows/publish-docker-images.yml)

### How it works

1. A semver tag is provided by `release-on-main.yml`, by manual workflow dispatch,
   or by a manually pushed tag matching `v[0-9]+.[0-9]+.[0-9]+`.
2. The workflow strips the `v` prefix and derives two tag aliases:
   - `1.2.3` — exact patch version
   - `1.2` — floating minor alias
3. It builds and pushes three images to [our Docker Hub](https://hub.docker.com/repositories/switchbacktech):
   - `switchbacktech/compass-backend`
   - `switchbacktech/compass-mongo`
   - `switchbacktech/compass-web`
4. Each image gets all three tags: `1.2.3`, `1.2`, and `latest`.

### Tag pattern rules

Only clean semver tags trigger this workflow from a tag push. Tags with suffixes
(e.g. `v1.2.3-test`) do not match and are safe to push for local testing without
publishing images.

---

## Staging Deploy

Source: [`.github/workflows/deploy-staging.yml`](../../.github/workflows/deploy-staging.yml)

The deploy workflow SSHes into the staging VPS and runs `./compass update`,
which pulls the Docker Hub image tag configured by the staging `compass.yaml` file and
restarts the stack. The workflow accepts a release tag input so the Actions logs
show which release triggered or motivated the deploy.

Manual staging redeploys do not rebuild images. Run `Deploy staging` with an
existing tag after confirming the desired image tags already exist on Docker Hub.

### Required secrets

All secrets go in **GitHub → Settings → Secrets and variables → Actions**:

| Secret | Value |
|---|---|
| `DOCKERHUB_USERNAME` | Docker Hub username for the `switchbacktech` org |
| `DOCKERHUB_TOKEN` | Docker Hub personal access token (Read & Write) |
| `STAGING_SSH_HOST` | VPS IP address or hostname |
| `STAGING_SSH_USER` | Linux user on the VPS that owns `~/compass` |
| `STAGING_SSH_KEY` | Private key from the deploy keypair (the `compass-staging-deploy` file, not `.pub`) |
