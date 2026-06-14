# Workflows

Compass uses GitHub Actions for continuous integration, Docker Hub for image distribution, and a VPS for staging.

| Workflow | Trigger | Purpose |
|---|---|---|
| Test | Push / PR to `main` | Runs lint, type-check, and unit tests |
| CodeQL | Push / PR to `main` | Static security analysis |
| Release on main | Push to `main` | Auto-increments patch version, publishes Docker images, then deploys staging |
| Publish Docker images | Reusable workflow / manual dispatch / manual `v*.*.*` tag push | Builds and pushes Docker images only |
| Deploy staging | Reusable workflow / manual dispatch | Pulls published images on staging, restarts the stack, then runs deploy health checks |
| Deploy production | Manual dispatch | Deploys a release tag to production, then runs cloud deploy health checks |
| Deploy health check | Reusable workflow | Validates the deployed staging stack and alerts Discord on failure |
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
              ├─► staging-cloud deploy health check
              └─► staging-selfhosted deploy health check
```

The automatic path calls reusable workflows directly. It uses `GITHUB_TOKEN` to
push the git tag, then passes that tag to the publish and deploy workflows. It
does not rely on the workflow-created tag push to trigger another workflow.
The release workflow remains blocked until both staging deploy health checks pass.
If a health check fails, the reusable workflow sends one Discord alert for that
environment with the release tag, run URL, failed check names, and redacted
excerpts.

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

After each staging environment deploy, `deploy-staging.yml` calls
`deploy-health-check.yml`. The health check SSHes into the same host, verifies
`~/compass`, `./compass status`, bounded Docker Compose logs, service health,
expected Docker image tags, frontend HTML, backend `/health`, and data-service
reachability. The `staging-cloud` profile checks the external MongoDB URI. The
`staging-selfhosted` profile additionally checks MongoDB, SuperTokens, and the
expected Docker volumes inside the self-hosted stack.

Manual staging redeploys do not rebuild images. Run `Deploy staging` with an
existing tag after confirming the desired image tags already exist on Docker Hub.

### Required secrets and variables

Secrets and variables are split between repository level (shared across workflows) and the `Staging` GitHub Environment (scoped to the deploy job).

**Repository-level** — GitHub → Settings → Secrets and variables → Actions:

| Name | Value |
|---|---|
| `DOCKERHUB_USERNAME` | Docker Hub username for the `switchbacktech` org |
| `DOCKERHUB_TOKEN` | Docker Hub personal access token (Read & Write) |
| `DISCORD_DEPLOY_WEBHOOK_URL` | Discord webhook for deploy health check failure alerts |

**`Staging` environment** — GitHub → Settings → Environments → Staging:

| Secret | Value |
|---|---|
| `SSH_PRIVATE_KEY` | Private key from the deploy keypair |
| `COMPASS_SYNC_TOKEN` | Token for compass sync |
| `GCAL_NOTIFICATION_TOKEN` | Google Calendar notification token |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret |
| `MONGO_PASSWORD` | MongoDB compass user password |
| `MONGO_REPLICA_SET_KEY` | MongoDB replica set key |
| `SUPERTOKENS_KEY` | SuperTokens API key |
| `SUPERTOKENS_POSTGRES_PASSWORD` | SuperTokens PostgreSQL password |

| Variable | Value |
|---|---|
| `SSH_HOST` | VPS IP address or hostname |
| `SSH_USER` | Linux user on the VPS that owns `~/compass` |
| `BACKEND_API_URL` | Staging backend API URL |
| `FRONTEND_URL` | Staging frontend URL |
| `GOOGLE_CLIENT_ID` | OAuth client ID |

---

## Production Deploy

Source: [`.github/workflows/deploy-production.yml`](../../.github/workflows/deploy-production.yml)

Production deploys are manual-only. Run `Deploy production` from GitHub Actions
with an existing release tag, such as `v1.2.3`; it is not called by
`release-on-main.yml` and does not run automatically after PR merges.

The workflow deploys to the GitHub `production` environment through
`_deploy-environment.yml`, builds an environment-specific web image tagged
`switchbacktech/compass-web:production-<version>`, then runs
`deploy-health-check.yml` with the `cloud` profile. Production is expected to use
external MongoDB and SuperTokens Cloud rather than self-hosted data services.

For cloud web image builds, `_deploy-environment.yml` uses
`.github/docker/Dockerfile.web` so frontend-only cloud config, such as PostHog,
is baked into the bundle without adding cloud-only settings to the self-host
Dockerfile.
