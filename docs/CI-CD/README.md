# CI/CD

Compass uses GitHub Actions for continuous integration and Docker Hub for distributing self-host images.

## Workflows

| Workflow | Trigger | Purpose |
|---|---|---|
| Test | Push / PR to `main` | Runs lint, type-check, and unit tests |
| CodeQL | Push / PR to `main` | Static security analysis |
| Publish Docker images | Push a `v*.*.*` tag | Builds and publishes self-host images to Docker Hub |
| Sync docs to compass-docs | Push to `main` touching `docs/**` | Mirrors this `docs/` directory to docs.compasscalendar.com |

---

## Publish Docker Images

Source: [`.github/workflows/publish-images.yml`](../../.github/workflows/publish-images.yml)

### How it works

1. A maintainer pushes a git tag matching `v[0-9]+.[0-9]+.[0-9]+` (e.g. `v1.2.3`).
2. The workflow strips the `v` prefix and derives two tag aliases:
   - `1.2.3` — exact patch version
   - `1.2` — floating minor alias
3. It builds and pushes three images to Docker Hub:
   - `switchbacktech/compass-backend`
   - `switchbacktech/compass-mongo`
   - `switchbacktech/compass-web`
4. Each image gets all three tags: `1.2.3`, `1.2`, and `latest`.

### Tag pattern rules

- The trigger only fires on clean semver tags: `v1.2.3`. Tags with suffixes (e.g. `v1.2.3-test`) do not match and will not trigger the workflow.
- Do not tag from the GitHub Releases UI unless you intend to publish a release — that sends notifications to watchers. Tag from the CLI instead.

### Publishing a release

```sh
git tag v1.2.3
git push origin v1.2.3
```

Watch progress in the [Actions tab](https://github.com/SwitchbackTech/compass/actions). After the workflow completes, all three images appear on Docker Hub under the `switchbacktech` org.

### Removing a test tag

```sh
git push origin --delete v1.2.3
git tag -d v1.2.3
```

### Required secrets

Two secrets must be set in **GitHub → Settings → Secrets and variables → Actions**:

| Secret | Value |
|---|---|
| `DOCKERHUB_USERNAME` | Docker Hub username for the `switchbacktech` org |
| `DOCKERHUB_TOKEN` | Docker Hub personal access token (Read & Write) |

### Web image build-args

`BASEURL` and `GOOGLE_CLIENT_ID` are baked into the web bundle at compile time. The published image ships with localhost defaults:

- `BASEURL=http://localhost:3000/api`
- `GOOGLE_CLIENT_ID=compass-self-host-placeholder.apps.googleusercontent.com`

This works for local installs. Users who need a different API domain or real Google credentials must rebuild the web image locally using the commented-out `build:` blocks in `docker-compose.yml`.

---

## CLI and Maintenance Commands

Internal tooling for database operations during development and production maintenance.

See [cli-and-maintenance-commands.md](./cli-and-maintenance-commands.md).
