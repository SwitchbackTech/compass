# Monitoring

## Health endpoint

The backend exposes a health check endpoint you can call from your own monitoring setup:

```
GET /api/health
```

No authentication required.

**Response (healthy):** `200 OK`

```json
{"status": "ok", "timestamp": "2025-01-01T00:00:00.000Z"}
```

**Response (unhealthy):** `500 Internal Server Error`

```json
{"status": "error", "timestamp": "2025-01-01T00:00:00.000Z"}
```

The check calls `db.admin().ping()` against MongoDB. Call it on whatever schedule makes sense for your setup — Compass does not impose a polling interval.

## Google sync health

If Google Calendar sync is enabled, watch (channel) health is worth watching separately from the health endpoint above — it degrades quietly (missed notifications, expired channels) rather than returning an error.

What to watch, in backend logs:

- **`app:google-watch-repair`** — one line per repair attempt: `REFRESHED`, `REPAIRED`, `FULL_REPAIR_STARTED`, or `PRUNED` (info level), or `SKIPPED` with reason `COOLDOWN`/`LOCKED` (debug level). A `HEALTHY`/`NONE` outcome (nothing to do) is not logged, so silence on this namespace is itself a healthy sign. Repair runs opportunistically on every client SSE (re)connect and via scheduled maintenance.
- **`app:google-watch-maintenance.service`** — a debug-level summary after each `POST /api/sync/maintain-all` run (counts of ignored/pruned/refreshed/revoked watches across all users).
- **`GOOGLE_REVOKED` sync-status events** — published over SSE and logged when a user's Google access was revoked or their refresh token went missing. Compass prunes that user's Google-owned data automatically (see [Google Calendar](./google-calendar.md)). They'll need to reconnect.

`POST /api/sync/maintain-all` re-verifies every user's watches and is how expired/missing channels get caught outside the opportunistic SSE-triggered repair. The self-host Docker stack does not schedule calls to it for you — wire up your own external scheduler (cron, systemd timer, etc.) hitting it with the `x-comp-token` header set to `backend.compassToken`.

----

Have an idea on how we can make self-hosting easier? Let us know in [this GitHub Discussion](https://github.com/SwitchbackTech/compass/discussions/1694).
