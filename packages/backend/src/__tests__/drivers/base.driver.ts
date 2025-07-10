import http from "node:http";
import { type ManagerOptions, type Socket, io } from "socket.io-client";
import { type Request, agent } from "supertest";
import type {
  CompassSocket,
  CompassSocketServer,
} from "@core/types/websocket.types";
import { waitUntilEvent } from "@backend/common/helpers/common.util";
import { initExpressServer } from "@backend/servers/express/express.server";
import { webSocketServer } from "@backend/servers/websocket/websocket.server";
import { getServerUri } from "@backend/servers/websocket/websocket.util";

export class BaseDriver {
  private readonly app = initExpressServer();
  private readonly http = http.createServer(this.app);
  private readonly server = agent(this.app);
  private readonly websocketClients: Socket[] = [];

  private websocketServer?: CompassSocketServer;
  private serverUri?: string;

  private getSessionCookie(session?: { userId: string }): string {
    return `session=${JSON.stringify(session)}`;
  }

  /**
   * listen
   *
   * @returns {string} the server's address
   */
  async listen(): Promise<string> {
    this.serverUri = await new Promise((resolve, reject) => {
      this.http.listen(0);
      this.http.on("listening", () => resolve(getServerUri(this.http)));
      this.http.on("error", reject);
    });

    return this.serverUri;
  }

  setSessionPlugin(session?: { userId: string }) {
    return (req: Request & { session?: { getUserId: () => string } }): void => {
      if (session) req.set("Cookie", this.getSessionCookie(session));
    };
  }

  initWebsocketServer(): CompassSocketServer {
    this.websocketServer = webSocketServer.init(this.http);

    return this.websocketServer;
  }

  getServer() {
    return this.server;
  }

  getServerUri() {
    if (!this.serverUri) throw new Error("did you forget to call `listen`?");

    return this.serverUri;
  }

  getWebsocketServer() {
    return this.websocketServer;
  }

  /**
   * createWebsocketClient
   *
   * make sure to call listen() before using this method
   * otherwise the getServerUri function will fail
   * because the server address is not yet available
   */
  createWebsocketClient(
    user?: { userId: string; sessionId?: string },
    options: Pick<ManagerOptions, "autoConnect"> = { autoConnect: true },
  ): Socket {
    if (!this.serverUri) throw new Error("did you forget to call `listen`?");

    const client = io(this.serverUri, {
      ...options,
      withCredentials: true,
      extraHeaders: user ? { cookie: this.getSessionCookie(user) } : undefined,
    });

    this.websocketClients.push(client);

    return client;
  }

  async teardown() {
    try {
      await Promise.allSettled(
        this.websocketClients.map(
          async (client) =>
            new Promise((resolve) => {
              client.once("disconnect", resolve);
              if (client.connected) client.close();
              resolve("client already closed");
            }),
        ),
      );

      await this.websocketServer?.close();

      this.http.removeAllListeners();

      this.http.closeAllConnections();
    } catch (error) {
      console.error(error);
    }
  }

  async waitUntilWebsocketEvent<Payload extends unknown[], Result = Payload>(
    websocket: Parameters<typeof waitUntilEvent>["0"],
    event: string,
    beforeEvent: () => Promise<unknown> = () => Promise.resolve(),
    afterEvent: (...args: Payload) => Promise<Result> = (...args) =>
      Promise.resolve(args as unknown as Result),
  ): Promise<Result> {
    return waitUntilEvent(websocket, event, 2000, beforeEvent, afterEvent);
  }

  getUserSockets(userId: string): CompassSocket[] {
    const sockets: CompassSocket[] = [];

    this.websocketServer?.sockets.sockets.forEach((socket) => {
      if (socket.data.session.getUserId() === userId) sockets.push(socket);
    });

    return sockets;
  }

  async getConnectedUserClientSockets(
    userId: string,
    client: Socket,
  ): Promise<CompassSocket[]> {
    if (!this.websocketServer) {
      throw new Error("did you forget to call `listen`?");
    }

    const sockets = await this.waitUntilWebsocketEvent<CompassSocket[]>(
      this.websocketServer,
      "connection",
      async () => Promise.resolve(client.connect()),
      async () =>
        new Promise((resolve) =>
          process.nextTick(() => resolve(this.getUserSockets(userId))),
        ),
    );

    return sockets;
  }
}
