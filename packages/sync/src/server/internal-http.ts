import { type Request, type RequestHandler, type Response } from "express";
import { rateLimit } from "express-rate-limit";
import { Status } from "@core/errors/status.codes";
import { Logger } from "@core/logger/winston.logger";
import { type InternalAuthedRequest } from "@sync/auth/internal-auth";
import { type SyncMongoService } from "@sync/storage/sync-mongo.service";

const logger = Logger("sync:internal-http");

// A generous backstop, not a throttle: the only caller is the trusted Compass
// API over a private network, so this bounds a runaway loop or a compromised
// caller rather than shaping normal traffic. Keyed per client ip, fixed window.
// Shared by every internal authed route so they share one budget.
//
// The budget has to clear the API's *aggregate* steady state, because every
// backend->Sync call arrives from one container ip and therefore shares a
// single bucket: per-principal foreground refresh, the global change-feed
// poll, connection-status checks, and the page-at-a-time event range drain.
// Measured idle load on prod is ~105/min, so the previous 300/min left under
// 3x headroom on a value this comment calls a backstop — thin enough that a
// handful of concurrent users would have started shedding load. To be clear
// about what this did NOT cause: the 2026-08-23 502/503 bursts came from a
// cursor-expiry repair storm stalling Sync, not from this limiter, which was
// never observed to trip. Raised so it cannot become the next surprise.
const INTERNAL_RATE_LIMIT_PER_MINUTE = 6_000;

export const internalRateLimit: RequestHandler = rateLimit({
  windowMs: 60_000,
  limit: INTERNAL_RATE_LIMIT_PER_MINUTE,
  standardHeaders: true,
  legacyHeaders: false,
  // Tripping this is never normal. Say so loudly: express-rate-limit otherwise
  // just returns 429 and the API only ever sees an opaque `unavailable`, so a
  // throttle is indistinguishable from Sync being down.
  handler: (req, res) => {
    logger.error(
      `Internal rate limit exceeded (${INTERNAL_RATE_LIMIT_PER_MINUTE}/min) for ${req.ip} on ${req.method} ${req.path}; the API is being throttled`,
    );
    res.status(Status.TOO_MANY_REQUESTS).json({ error: "rate_limited" });
  },
});

// Read the verified auth context. The middleware always sets it on success;
// treat its absence as a bug, not an authorization, and never run unscoped.
export function requireAuth(
  req: Request,
  res: Response,
): InternalAuthedRequest["syncAuth"] | undefined {
  const auth = (req as InternalAuthedRequest).syncAuth;
  if (!auth) {
    res.status(Status.UNAUTHORIZED).json({ error: "unauthorized" });
    return undefined;
  }
  return auth;
}

// Guard against serving a request before storage is connected (liveness-first
// startup binds the port before Mongo). A read/write both need the db.
export function ensureConnected(
  mongo: SyncMongoService,
  res: Response,
): boolean {
  if (!mongo.isConnected) {
    res.status(Status.SERVICE_UNAVAILABLE).json({ error: "not_ready" });
    return false;
  }
  return true;
}

// Never surface storage internals or identity to the caller.
export function respondInternalError(res: Response): void {
  res.status(Status.INTERNAL_SERVER).json({ error: "internal_error" });
}
