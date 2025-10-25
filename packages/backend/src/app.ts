// sort-imports-ignore
import { logger } from "./init"; //must be first import

import { ENV } from "@backend/common/constants/env.constants";
import mongoService from "@backend/common/services/mongo.service";
import { initExpressServer } from "@backend/servers/express/express.server";
import { initNgrokServer } from "@backend/servers/ngrok/ngrok.server";
import { webSocketServer } from "@backend/servers/websocket/websocket.server";
import { type Listener } from "@ngrok/ngrok";
import { createServer, type Server } from "node:http";
import { initPollyJsServer } from "./servers/pollyjs/pollyjs.server";

const app = initExpressServer();
const httpServer: Server = createServer(app);
const ngrokServer = initNgrokServer(httpServer);
const pollyJsServer = initPollyJsServer();

function onClose() {
  logger.info(`Http server terminated`);
}

function onNgrokConnected(listener: Listener): void {
  Object.assign(process.env, { NGROK_DOMAIN_FULL: listener.url() });

  logger.info("NGrok server connected");
  logger.info(`NGrok server url: ${process.env["NGROK_DOMAIN_FULL"]}`);
}

function onNgrokClose() {
  logger.info(`NGrok server terminated`);
}

function onNgrokError(error: Error): void {
  logger.error("NGrok server errored: ", error);
}

async function start() {
  try {
    webSocketServer.init(httpServer);

    await mongoService.start();

    await new Promise((resolve) =>
      httpServer.listen(ENV.PORT, () => {
        logger.info(`Server running on port: ${ENV.PORT}`);
        ngrokServer?.emit("connect");
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

async function closeNGrokServer(): Promise<void> {
  const url = process.env["NGROK_DOMAIN_FULL"];
  const ngrok = await import("@ngrok/ngrok");
  const ngrokListener = url ? await ngrok.getListenerByUrl(url) : undefined;

  if (ngrokListener) {
    // do not wait for this promise,
    // underlying rust process termination not finished
    ngrokListener.close();
    ngrokServer?.emit("close");
  }
}

async function gracefulShutdown(): Promise<void> {
  try {
    await closeHttpServer();
    await mongoService.stop();
    await closeNGrokServer();
    await pollyJsServer?.stop();
  } catch (error) {
    logger.error("Problems encountered while shutting down", error);
  }
}

httpServer.on("close", onClose);

ngrokServer?.on("connected", onNgrokConnected);
ngrokServer?.on("error", onNgrokError);
ngrokServer?.on("close", onNgrokClose);

// gracefully shutdown server - mostly for development respawn with ts-node
process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);
process.on("SIGQUIT", gracefulShutdown);

if (require.main === module) start();
