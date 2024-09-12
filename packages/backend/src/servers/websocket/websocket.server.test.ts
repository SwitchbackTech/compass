import { Server as HttpServer } from "http";
import { createServer } from "node:http";
import { type AddressInfo } from "node:net";
import { Server as IoServer, type Socket as ServerSocket } from "socket.io";
import { io as ioc, type Socket as ClientSocket } from "socket.io-client";
import { Schema_Event } from "@core/types/event.types";
import {
  EVENT_CHANGE_PROCESSED,
  EVENT_CHANGED,
} from "@core/constants/websocket.constants";

import { initWebsocketServer } from "./websocket.server";

describe("WebSocket Server", () => {
  let httpServer: HttpServer;
  let io: IoServer;
  let serverSocket: ServerSocket;
  let clientSocket: ClientSocket;

  beforeAll((done) => {
    httpServer = createServer();
    io = initWebsocketServer(httpServer);
    httpServer.listen(() => {
      const port = (httpServer.address() as AddressInfo).port;
      const userId = "testUser123";

      clientSocket = ioc(`http://localhost:${port}`, {
        query: { userId },
      });

      io.on("connection", (socket) => {
        serverSocket = socket;
      });

      clientSocket.on("connect", done);
    });
  });

  afterAll(() => {
    io.close();
    httpServer.close();
    clientSocket.disconnect();
  });

  describe(EVENT_CHANGED, () => {
    it("emits event payload to client", (done) => {
      clientSocket.on(EVENT_CHANGED, (arg) => {
        expect(arg).toEqual({ _id: "1", title: "Test Event" });
        done();
      });

      const event: Schema_Event = { _id: "1", title: "Test Event" };
      serverSocket.emit(EVENT_CHANGED, event);
    });

    it.todo("emits eventChanged after reciving updated event data from Gcal");
  });

  describe(EVENT_CHANGE_PROCESSED, () => {
    it("accepts message from client after successful update", (done) => {
      const userId = "client123";

      serverSocket.on(EVENT_CHANGE_PROCESSED, (receivedUserId) => {
        expect(receivedUserId).toBe(userId);
        done();
      });

      clientSocket.emit(EVENT_CHANGE_PROCESSED, userId);
    });
  });
});
