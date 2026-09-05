# Live provider smoke

Nightly (and `workflow_dispatch`) run of the shared adapter contract suite
against real Google, Microsoft, and Apple test accounts. It never runs on
pull requests. Workflow: [`.github/workflows/live-provider-smoke.yml`](../../.github/workflows/live-provider-smoke.yml).

The job uses GitHub Environment `provider-smoke`. It does not read staging
or production deploy secrets. A provider whose secrets are absent is skipped,
so the job is green before Microsoft and Apple exist.

Events are created only on a calendar named `compass-smoke`. Every created
event's description carries the GitHub run id. A teardown step deletes
leftovers older than one day. Failure posts to the Discord errors webhook
with the provider name.

## Create the Environment

GitHub → Settings → Environments → New environment → `provider-smoke`.
Do not grant it access to staging or production secrets.

Copy the staging Google (and later Microsoft) OAuth client into this
Environment as well: the smoke process calls the provider APIs directly.

## Secrets and variables to paste

Environment secrets:

| Name | Value |
|---|---|
| `SMOKE_GOOGLE_REFRESH_TOKEN` | Refresh token for the Google test account that owns `compass-smoke` |
| `SMOKE_MICROSOFT_REFRESH_TOKEN` | Refresh token for the Microsoft test account |
| `SMOKE_APPLE_EMAIL` | iCloud email for the Apple test account |
| `SMOKE_APPLE_APP_PASSWORD` | iCloud app-specific password |
| `GOOGLE_CLIENT_SECRET` | Same Google OAuth client secret as staging |
| `MICROSOFT_CLIENT_SECRET` | Same Entra client secret as staging |
| `DISCORD_ERRORS_WEBHOOK_URL` | Discord errors webhook (duplicate of the repo secret so this Environment does not read repo secrets) |

Environment variables:

| Name | Value |
|---|---|
| `GOOGLE_CLIENT_ID` | Same Google OAuth client id as staging |
| `MICROSOFT_CLIENT_ID` | Same Entra client id as staging |

## Test calendar

On each connected account, create a calendar named exactly `compass-smoke`
and leave it writable. The suite refuses to run if that calendar is missing
and never writes to any other calendar.

## Dispatch

```bash
gh workflow run live-provider-smoke.yml
```

Apple runs when `SMOKE_APPLE_EMAIL` and `SMOKE_APPLE_APP_PASSWORD` are present
in the `provider-smoke` Environment.
