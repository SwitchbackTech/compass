# Sync Service Cutover

The backend can serve Google Calendar connections and events either from its
own legacy code, or by delegating to the standalone Sync service
(`packages/sync`). Two independent config knobs decide which:

| Config key | Env var | Delegates |
| --- | --- | --- |
| `sync.connectionRouting` | `SYNC_CONNECTION_ROUTING` | Browser-facing provider-connection routes (connect, list, disconnect) |
| `sync.eventRouting` | `SYNC_EVENT_ROUTING` | Calendar/event reads and durable write commands |

Both default to `legacy` and independently accept `sync`. They're separate
switches on purpose: event routing is the riskier surface (it owns writes),
so it can roll out — and roll back — on its own schedule from connection
routing.

Selecting `sync` for either key requires `sync.serviceUrl` (the backend's
address for the Sync service) to be set; the config schema enforces this
pairing at startup. `sync.execution` must also be `active` on the Sync
service side for it to actually do provider work (OAuth begin, imports,
webhook processing) — see [Self-Hosting](../self-hosting/README.md) for
how the self-host installer wires this up by default, and [Config](../Config/README.md#sync-service)
for the full key reference.

`sync.cloudMutationMode: maintenance` independently rejects cloud writes and
new connections with a typed `503 MAINTENANCE` response, regardless of
routing — useful for a brief freeze during a routing change.

Backend refuses to start with `execution=active` + `cloudMutationMode=enabled`
while either routing key is still `legacy` (the dual-writer guard) — that
combination would let both the legacy engine and Sync attempt writes.

## Troubleshooting a Sync-delegation issue

If events or connections aren't behaving as expected under Sync ownership:

1. Confirm `GET /api/config` shows `sync.connectionRouting` / `sync.eventRouting` as `sync`, not `legacy`.
2. Confirm `sync.serviceUrl` is actually set — the token alone does not enable delegation.
3. Confirm the Sync service is reachable and healthy on its own port (`GET /health/live` on `sync.port`, default `3010`).
4. Check the Sync container's own logs, not just the backend's — routing state can be correct while Sync itself is unhealthy or passive. See [Monitoring](../self-hosting/monitoring.md#sync-google-calendar-health).

A backend startup refusal mentioning the dual-writer guard means `execution=active` and `cloudMutationMode=enabled` are set while a routing key is still `legacy` — either flip the remaining routing key to `sync`, or drop back to `passive`/`maintenance` until it is.
