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

### Manually publishing a release

Although tags are created automatically as part of the release flow, you can also create them manually to publish images from a local branch.

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
