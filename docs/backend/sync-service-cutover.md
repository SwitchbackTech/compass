# Sync Service Delegation

The backend can serve Google Calendar connections and events either from its
own legacy code, or by delegating to the standalone Sync service
(`packages/sync`). There is no separate switch to flip: the backend delegates
automatically whenever `sync.serviceUrl` (the backend's address for the Sync
service) is configured, and stays on the legacy engine otherwise. See
[Self-Hosting](../self-hosting/README.md) for how the self-host installer
wires this up by default, and [Config](../Config/README.md#sync-service) for
the full key reference.

`sync.execution` must be `active` on the Sync service side for it to actually
do provider work (OAuth begin, imports, webhook processing).
`sync.cloudMutationMode: maintenance` independently rejects cloud writes and
new connections with a typed `503 MAINTENANCE` response — useful for a brief
freeze during maintenance.

## Troubleshooting a Sync-delegation issue

If events or connections aren't behaving as expected under Sync ownership:

1. Confirm `GET /api/config` shows `google.connectDelegatedToSync` as `true`.
2. Confirm `sync.serviceUrl` is actually set — the token alone does not enable delegation.
3. Confirm the Sync service is reachable and healthy on its own port (`GET /health/live` on `sync.port`, default `3010`).
4. Check the Sync container's own logs, not just the backend's — delegation can be correctly configured while Sync itself is unhealthy or passive. See [Monitoring](../self-hosting/monitoring.md#sync-google-calendar-health).
