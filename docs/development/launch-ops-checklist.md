# Launch ops checklist

Short checklist for release / high-traffic days. Pair with
[Monitoring](../self-hosting/monitoring.md) for endpoint details.

## Before send

- [ ] `GET /api/health` returns `200 {"status":"ok"}`
- [ ] Sync `GET /health/live` and `GET /health/ready` are healthy; logs show
      `execution=active` when Google sync is enabled
- [ ] Deploy Discord health webhook is configured (see
      [CI/CD workflows](../CI-CD/workflows.md))
- [ ] PostHog Error Tracking is receiving `$exception` from web (open a
      staging page and trigger a handled test if needed)
- [ ] Confirm `sync_health_snapshot` events arrive every ~5 minutes in PostHog

## Alerts to create in PostHog (or Discord)

Alert on `sync_health_snapshot` properties (low cardinality — safe to alert):

| Signal | Suggested threshold |
| --- | --- |
| `connections.actionRequired` | rising or absolute &gt; 0 for 10+ minutes under load |
| `jobs.failed` | rising vs baseline |
| `jobs.oldestDueAgeMs` | &gt; 5 minutes while `execution=active` |
| `freshness.percentOver30s` | sustained spike vs quiet baseline |

Also watch:

- Web `$exception` rate (Error Tracking)
- Client event `sse_connection_degraded` (prolonged EventSource non-OPEN)

## During launch

- [ ] Watch Sync health snapshot + Error Tracking side by side
- [ ] If calendars look stuck: check SSE (`sse_connection_degraded`), then Sync
      diagnostic routes (see [Troubleshoot](../development/troubleshoot.md))
- [ ] Backend Winston / PostHog Logs now include `method`, `path`, `status`,
      and `userId` on Express errors — use those for triage

## After

- [ ] Resolve or suppress any new Error Tracking noise
- [ ] Note any `actionRequired` / delayed cohorts for follow-up reconnect email
