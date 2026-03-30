import type { Request, Response } from "express";
import { USER_METADATA } from "@core/constants/sse.constants";
import { Logger } from "@core/logger/winston.logger";
import { sseServer } from "@backend/servers/sse/sse.server";
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
      sseServer.publishTo(res, USER_METADATA, metadata);
    } catch (err) {
      logger.error(`Failed to open SSE stream for user ${userId}:`, err);
    }
  };
}

export default new EventsController();
