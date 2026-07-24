import { type Express, type RequestHandler } from "express";
import { Status } from "@core/errors/status.codes";
import {
  ChangeFeedResponseSchema,
  ChangeFeedResumeQuerySchema,
} from "@core/types/sync/change-feed.contracts";
import { readChangeFeed } from "@sync/domain/change-feed.service";
import {
  ensureConnected,
  internalRateLimit,
  requireAuth,
  respondInternalError,
} from "@sync/server/internal-http";
import { InvalidationRepository } from "@sync/storage/repositories/invalidation.repository";
import { type SyncMongoService } from "@sync/storage/sync-mongo.service";

export const CHANGES_PATH = "/internal/changes";

export interface ChangeFeedApiDeps {
  authMiddleware: RequestHandler;
  mongo: SyncMongoService;
}

// Internal, authenticated change-feed poll. Serves content-free invalidation
// envelopes for the signed principal. Read-only against the outbox, so it is
// available in passive mode. Tenant/principal come from signed auth headers —
// never from the query.
export function registerChangeFeedRoutes(
  app: Express,
  deps: ChangeFeedApiDeps,
): void {
  app.get(
    CHANGES_PATH,
    internalRateLimit,
    deps.authMiddleware,
    async (req, res) => {
      const auth = requireAuth(req, res);
      if (!auth) return;
      if (!ensureConnected(deps.mongo, res)) return;

      const rawCursor = req.query["cursor"];
      // Omit / empty / explicit "null" → resume from now. A repeated query key
      // arrives as an array from Express and is rejected.
      let cursor: string | null = null;
      if (rawCursor !== undefined) {
        if (Array.isArray(rawCursor)) {
          res.status(Status.BAD_REQUEST).json({ error: "invalid_cursor" });
          return;
        }
        if (typeof rawCursor !== "string") {
          res.status(Status.BAD_REQUEST).json({ error: "invalid_cursor" });
          return;
        }
        if (rawCursor !== "" && rawCursor !== "null") {
          cursor = rawCursor;
        }
      }

      const parsed = ChangeFeedResumeQuerySchema.safeParse({ cursor });
      if (!parsed.success) {
        res.status(Status.BAD_REQUEST).json({ error: "invalid_cursor" });
        return;
      }

      try {
        const response = await readChangeFeed(
          { invalidations: new InvalidationRepository(deps.mongo.db) },
          auth.tenantId,
          auth.principalId,
          parsed.data.cursor,
        );
        res.status(Status.OK).json(ChangeFeedResponseSchema.parse(response));
      } catch {
        respondInternalError(res);
      }
    },
  );
}
