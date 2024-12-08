import { Server as HttpServer } from "http";
import { createServer } from "node:http";
import { Server as IoServer, type Socket as ServerSocket } from "socket.io";
import { io as ioc, type Socket as ClientSocket } from "socket.io-client";
import { Schema_Event } from "@core/types/event.types";
import {
  EVENT_CHANGE_PROCESSED,
  EVENT_CHANGED,
} from "@core/constants/websocket.constants";

import { getServerUri } from "./websocket.util";
import { WebSocketServer } from "./websocket.server";

describe("WebSocket Server", () => {
  let httpServer: HttpServer;
  let wsServer: IoServer;
  let client: ClientSocket;
  let socket: ServerSocket;

  beforeAll((done) => {
    httpServer = createServer();
    wsServer = new WebSocketServer().init(httpServer);
    httpServer.listen(() => {
      const uri = getServerUri(httpServer);
      const userId = "testUser123";

      client = ioc(uri, {
        query: { userId },
      });

      wsServer.on("connection", (_socket) => {
        socket = _socket;
      });

      client.on("connect", done);
    });
  });

  afterAll((done) => {
    wsServer
      .close()
      .then(() => httpServer.close())
      .then(() => {
        client.disconnect();
        done();
      })
      .catch((err) => {
        console.error(err);
        done();
      });
  });

  describe(EVENT_CHANGED, () => {
    it("emits eventpayload  to client", (done) => {
      client.on(EVENT_CHANGED, (arg) => {
        expect(arg).toEqual({ _id: "1", title: "Test Event" });
        done();
      });

      const event: Schema_Event = { _id: "1", title: "Test Event" };
      socket.emit(EVENT_CHANGED, event);
    });
  });

  describe(EVENT_CHANGE_PROCESSED, () => {
    it("accepts message from client after successful update", (done) => {
      const userId = "client123";

      socket.on(EVENT_CHANGE_PROCESSED, (receivedUserId) => {
        expect(receivedUserId).toBe(userId);
        done();
      });

      client.emit(EVENT_CHANGE_PROCESSED, userId);
    });
  });
});
