import { Server as HttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import {
  ClientToServerEvents,
  CompassSocketServer,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from "@core/types/websocket.types";
import {
  EVENT_CHANGE_PROCESSED,
  EVENT_CHANGED,
} from "@core/constants/websocket.constants";
import { Logger } from "@core/logger/winston.logger";
import { Schema_Event } from "@core/types/event.types";
import { SocketError } from "@backend/common/constants/error.constants";
import { error } from "@backend/common/errors/handlers/error.handler";
import { ENV } from "@backend/common/constants/env.constants";

const logger = Logger("app:websocket.server");

let io: CompassSocketServer;
export const connections = new Map<string, string>(); // { userId: socketId }

export const emitEventToUser = (
  userId: string,
  event: Schema_Event,
  server?: CompassSocketServer
) => {
  const socketServer = server || io;
  const socketId = connections.get(userId);

  if (!socketId) {
    logger.warn(
      `Event update not sent to client due to missing userId: ${userId}`
    );
    throw error(
      SocketError.SocketIdNotFound,
      "Event update not sent to client"
    );
  }

  socketServer.to(socketId).emit(EVENT_CHANGED, event);
};

export const initWebsocketServer = (server: HttpServer) => {
  io = new SocketIOServer<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(server, {
    cors: {
      origin: ENV.ORIGINS_ALLOWED,
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    const userId = socket.handshake.query["userId"] as SocketData["userId"];

    if (!userId) {
      throw error(SocketError.SocketIdNotFound, "Connection closed");
    }

    logger.debug(`Connection made to: ${userId}`);
    connections.set(userId, socket.id);
    console.log(connections);

    socket.on("disconnect", () => {
      logger.debug(`Disconnecting from: ${userId}`);
      connections.delete(userId);
    });

    socket.on(EVENT_CHANGE_PROCESSED, (clientId) => {
      logger.debug(`Client successfully processed updated: ${clientId}`);
    });
  });

  return io;
};
