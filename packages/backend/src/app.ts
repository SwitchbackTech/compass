import { CONFIG } from "@backend/common/constants/config.constants";
import mongoService from "@backend/common/services/mongo.service";
import { initExpressServer } from "@backend/servers/express/express.server";
import { warnIfWebhookNotPublicHttps } from "@backend/sync/services/watch/google-watch-config";
import { logger } from "./init"; //must be first import
import { createServer, type Server } from "node:http";

const app = initExpressServer();
const httpServer: Server = createServer(app);

function onClose() {
  logger.info(`Http server terminated`);
}

async function start() {
  try {
    warnIfWebhookNotPublicHttps(logger);

    await mongoService.start();

    await new Promise((resolve) =>
      httpServer.listen(CONFIG.PORT, () => {
        logger.info(`Server running on port: ${CONFIG.PORT}`);
        resolve(undefined);
      }),
    );
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
    await closeHttpServer();
    await mongoService.stop();
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
