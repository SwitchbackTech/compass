import http from "node:http";
import { Request, agent } from "supertest";
import { initExpressServer } from "@backend/servers/express/express.server";
import { webSocketServer } from "@backend/servers/websocket/websocket.server";
import { CompassSocketServer } from "../../../../core/src/types/websocket.types";

export class BaseDriver {
  private readonly app = initExpressServer();
  private readonly http = http.createServer(this.app);
  private readonly server = agent(this.app);

  private websocketServer?: CompassSocketServer;

  setSessionPlugin(session?: { userId: string }) {
    return (req: Request & { session?: { getUserId: () => string } }): void => {
      if (session) req.set("Cookie", `session=${JSON.stringify(session)}`);
    };
  }

  initWebsocketServer(): CompassSocketServer {
    this.websocketServer = webSocketServer.init(this.http);

    return this.websocketServer;
  }

  getServer() {
    return this.server;
  }

  getWebsocketServer() {
    return this.websocketServer;
  }

  async teardown() {
    await this.websocketServer?.close();

    await new Promise((resolve, reject) =>
      this.http.close((error) => (error ? reject(error) : resolve(undefined))),
    ).catch(() => {});
  }
}
