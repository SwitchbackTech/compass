import { Server as HttpServer } from "http";
import { createServer } from "node:http";
import { type AddressInfo } from "node:net";
import { Server as IoServer, type Socket as ServerSocket } from "socket.io";
import { io as ioc, type Socket as ClientSocket } from "socket.io-client";

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
      clientSocket = ioc(`http://localhost:${port}`);

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

  it("emits msg from server to client after event change", (done) => {
    clientSocket.on("eventChanged", (arg) => {
      expect(arg).toEqual({ id: 1, name: "Test Event" });
      done();
    });

    serverSocket.emit("eventChanged", { id: 1, name: "Test Event" });
  });

  it("accepts message from client after successful update", (done) => {
    const clientId = "client123";

    serverSocket.on("eventChanged", (receivedClientId) => {
      expect(receivedClientId).toBe(clientId);
      done();
    });

    clientSocket.emit("eventChanged", clientId);
  });
});
