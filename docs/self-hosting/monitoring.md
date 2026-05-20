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

Have an idea on how we can make self-hosting easier? Let us know in [this GitHub Discussion](https://github.com/SwitchbackTech/compass/discussions/1694).
