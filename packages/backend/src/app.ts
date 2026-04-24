import { ENV } from "@backend/common/constants/env.constants";
import mongoService from "@backend/common/services/mongo.service";
import { initExpressServer } from "@backend/servers/express/express.server";
import { logger } from "./init"; //must be first import
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
      httpServer.listen(ENV.PORT, () => {
        logger.info(`Server running on port: ${ENV.PORT}`);
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

// @ts-expect-error -- import.meta.main is Bun-native; tsconfig targets commonjs
if (import.meta.main) {
  void start();
}
