import { type Request, type RequestHandler, type Response } from "express";
import { rateLimit } from "express-rate-limit";
import { Status } from "@core/errors/status.codes";
import { type InternalAuthedRequest } from "@sync/auth/internal-auth";
import { type SyncMongoService } from "@sync/storage/sync-mongo.service";

// A generous backstop, not a throttle: the only caller is the trusted Compass
// API over a private network, so this bounds a runaway loop or a compromised
// caller rather than shaping normal traffic. Keyed per client ip, fixed window.
// Shared by every internal authed route so they share one budget.
export const internalRateLimit: RequestHandler = rateLimit({
  windowMs: 60_000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
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
