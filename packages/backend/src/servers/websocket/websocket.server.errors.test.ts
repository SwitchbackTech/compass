import { Server as HttpServer } from "node:http";
import { createServer } from "node:http";
import { io as ioc, type Socket as ClientSocket } from "socket.io-client";
import { Server as IoServer } from "socket.io";
import { SocketError } from "@backend/common/constants/error.constants";

import { getServerUri } from "./websocket.util";
import { WebSocketServer } from "./websocket.server";

describe("WebSocket Server: Error Handling", () => {
  let httpServer: HttpServer;
  let serverUri: string;
  let wsServer: IoServer;
  let invalidClient: ClientSocket;

  beforeAll((done) => {
    httpServer = createServer();
    wsServer = new WebSocketServer().init(httpServer);
    httpServer.listen(() => {
      serverUri = getServerUri(httpServer);
      done();
    });
  });

  afterAll((done) => {
    if (invalidClient) {
      invalidClient.close();
    }
    if (wsServer) {
      wsServer
        .close()
        .catch((err) => console.warn("Error closing ws server:", err));
    }
    if (httpServer.listening) {
      httpServer.close(done);
    } else {
      done();
    }
  });

  it("refuses connection if client's userId is null or undefined", (done) => {
    const invalidUserId = Math.random() < 0.5 ? undefined : null;
    const invalidClient = ioc(serverUri, {
      query: { userId: invalidUserId },
    });

    invalidClient.on("connect_error", (err) => {
      expect(err.message).toEqual(SocketError.InvalidSocketId.description);
      done();
    });

    invalidClient.connect();
  });
});
