// sort-imports-ignore
import * as http from "http";
import { logger } from "./init";

import { ENV } from "./common/constants/env.constants";
import mongoService from "./common/services/mongo.service";
import { initExpressServer } from "./servers/express/express.server";
import { webSocketServer } from "./servers/websocket/websocket.server";

const app = initExpressServer();
const httpServer: http.Server = http.createServer(app);

function onClose() {
  logger.info(`Http server terminated`);
}

async function start() {
  try {
    webSocketServer.init(httpServer);

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

async function terminateServices(): Promise<number> {
  if (httpServer.listening) {
    await new Promise((resolve, reject) =>
      httpServer.close((error) => (error ? reject(error) : resolve(undefined))),
    );
  }

  await mongoService.stop();

  return 0;
}

async function gracefulShutdown(): Promise<number> {
  try {
    const exitCode = await terminateServices();

    process.exit(exitCode);
  } catch (error) {
    logger.error("Problems encountered while shutting down", error);

    process.exit(0);
  }
}

httpServer.on("close", onClose);

// gracefully shutdown server - mostly for development respawn with ts-node
process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);
process.on("SIGQUIT", gracefulShutdown);

if (require.main === module) start();
