import { type Request, type Response } from "express";
import { Logger } from "@core/logger/winston.logger";
import { sseServer } from "@backend/servers/sse/sse.server";
import { googleWatchRepairService } from "@backend/sync/services/watch/google-watch-repair.service";
import userService from "@backend/user/services/user.service";
import userMetadataService from "@backend/user/services/user-metadata.service";

const logger = Logger("app:events.controller");

class EventsController {
  streamEvents = async (req: Request, res: Response): Promise<void> => {
    const userId = req.session!.getUserId();

    try {
      // Subscribe immediately so no events are missed during the metadata fetch.
      const unsubscribe = sseServer.subscribe(userId, res);
      req.on("close", unsubscribe);

      // Replay current state after subscribing — client is never stuck on reconnect.
      const metadata = await userMetadataService.fetchUserMetadata(userId);
      sseServer.publishTo(res, {
        type: "userMetadataChanged",
        metadata: metadata as Record<string, unknown>,
      });

      // Defensive, fire-and-forget: a client reconnecting is a cheap,
      // frequent moment to notice/repair stale Google watches. Cooldown +
      // lease inside the coordinator keep this safe across multiple tabs
      // and repeated reconnects; must never block or fail the stream.
      void googleWatchRepairService
        .repairGoogleWatchesForUser(userId)
        .catch((err) => {
          logger.error(`Google watch repair failed for user ${userId}:`, err);
        });

      // Same fire-and-forget shape: lets scheduled watch maintenance (A40)
      // tell an active user apart from an abandoned account without
      // blocking or failing the stream.
      void userService.touchLastSeenAt(userId).catch((err) => {
        logger.error(`Failed to record lastSeenAt for user ${userId}:`, err);
      });
    } catch (err) {
      logger.error(`Failed to open SSE stream for user ${userId}:`, err);
      if (!res.headersSent) {
        res.status(500).end();
      }
    }
  };
}

export default new EventsController();
