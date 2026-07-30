import { type Request, type Response } from "express";
import { Logger } from "@core/logger/winston.logger";
import { sseServer } from "@backend/servers/sse/sse.server";
import userService from "@backend/user/services/user.service";
import userMetadataService from "@backend/user/services/user-metadata.service";

const logger = Logger("app:events.controller");

class EventsController {
  streamEvents = async (req: Request, res: Response): Promise<void> => {
    const userId = req.session!.getUserId();

    try {
      // Subscribe immediately so no events are missed during the metadata fetch.
      // The Sync change-feed bridge polls independently of any one connection
      // (a single global poller for the whole process, not one per user) and
      // fans out to whoever is subscribed, so no per-connection wiring is
      // needed here beyond the subscription itself.
      const unsubscribe = sseServer.subscribe(userId, res);
      req.on("close", unsubscribe);

      // Replay current state after subscribing — client is never stuck on reconnect.
      const metadata = await userMetadataService.fetchUserMetadata(userId);
      sseServer.publishTo(res, {
        type: "userMetadataChanged",
        metadata: metadata as Record<string, unknown>,
      });

      // Fire-and-forget: lets scheduled watch maintenance (A40)
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
