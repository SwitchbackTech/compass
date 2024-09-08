import {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from "@core/types/websocket.types";
import { Server as HttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { Logger } from "@core/logger/winston.logger";
import { Schema_Event } from "@core/types/event.types";
import { SocketError } from "@backend/common/constants/error.constants";
import { error } from "@backend/common/errors/handlers/error.handler";

const logger = Logger("app:root");

export const connections = new Map<string, string>(); // { userId: socketId }

export const emitEventToUser = (userId: string, event: Schema_Event) => {
  const socketId = connections.get(userId);

  if (!socketId) {
    logger.warning("Event update not sent to client due to userId:", userId);
    throw error(
      SocketError.SocketIdNotFound,
      "Event update not sent to client"
    );
  }

  const io = new SocketIOServer<ServerToClientEvents>();
  io.to(socketId).emit("eventChanged", event);
};

export const initWebsocketServer = (server: HttpServer) => {
  const io = new SocketIOServer<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(server, {});

  io.on("connection", (socket) => {
    // const userId = socket.handshake.query["userId"] as string | undefined;
    const userId = "123"; //TODO update

    if (!userId) {
      throw error(SocketError.SocketIdNotFound, "Connection closed");
    }

    connections.set(userId, socket.id);

    socket.on("disconnect", () => {
      connections.delete(userId);
    });

    socket.on("eventChangeProcessed", (clientId) => {
      console.log("client successfully processed updated:", clientId);
    });
  });

  return io;
};
