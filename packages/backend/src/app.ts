import { CONFIG } from "@backend/common/constants/config.constants";
import mongoService from "@backend/common/services/mongo.service";
import { initExpressServer } from "@backend/servers/express/express.server";
import { syncChangeFeedBridge } from "@backend/servers/sse/sync-change-feed.bridge";
import { logger } from "./init"; //must be first import
import { stopPostHogLogs } from "./logging/posthog-logs";
import { createServer, type Server } from "node:http";

const app = initExpressServer();
const httpServer: Server = createServer(app);

function onClose() {
  logger.info(`Http server terminated`);
}

async function start() {
  try {
    await mongoService.start();

    await new Promise((resolve) =>
      httpServer.listen(CONFIG.PORT, () => {
        logger.info(`Server running on port: ${CONFIG.PORT}`);
        resolve(undefined);
      }),
    );

    // One multiplexed poll of Sync's global change feed for the life of this
    // process, fanning invalidations out to whichever SSE subscribers are
    // locally connected. Started here (not at module import) so a test
    // importing the bridge for its types never triggers a live network poll.
    syncChangeFeedBridge.start();
  } catch (error) {
    logger.error("Problems encountered during startup", error);

    process.exit(0);
  }
}

async function closeHttpServer(): Promise<void> {
  if (httpServer.listening) {
    await new Promise((resolve, reject) =>
      httpServer.close((error) => (error ? reject(error) : resolve(undefined))),
    );
  }
}

async function gracefulShutdown(): Promise<void> {
  try {
    syncChangeFeedBridge.stop();
    await closeHttpServer();
    await mongoService.stop();
    await stopPostHogLogs();
  } catch (error) {
    logger.error("Problems encountered while shutting down", error);
  }
}

httpServer.on("close", onClose);

// graceful shutdown keeps Bun watch restarts and local exits clean
process.on("SIGTERM", () => {
  void gracefulShutdown();
});
process.on("SIGINT", () => {
  void gracefulShutdown();
});
process.on("SIGQUIT", () => {
  void gracefulShutdown();
});

if (import.meta.main) {
  void start();
}
