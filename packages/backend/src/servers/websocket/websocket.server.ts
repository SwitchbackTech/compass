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
import { SocketError } from "@backend/common/constants/error.constants";
import { error } from "@backend/common/errors/handlers/error.handler";
import { ENV } from "@backend/common/constants/env.constants";

import { handleWsError } from "./websocket.util";

const logger = Logger("app:websocket.server");

let wsServer: CompassSocketServer;
export const connections = new Map<string, string>(); // { userId: socketId }

export const notifyClient = (userId: string, server?: CompassSocketServer) => {
  const socketServer = server || wsServer;
  const socketId = connections.get(userId);

  if (!socketId) {
    logger.warn(
      `Event update not sent to client due to missing userId: ${userId}`
    );
    throw error(SocketError.InvalidSocketId, "Event update not sent to client");
  }

  socketServer.to(socketId).emit(EVENT_CHANGED);
};

export const initWebsocketServer = (server: HttpServer) => {
  wsServer = new SocketIOServer<
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

  wsServer.use((socket, next) => {
    if (socket.handshake) {
      const userId = socket.handshake.query["userId"] as string;

      if (!userId || userId === "undefined" || userId === "null") {
        const err = error(SocketError.InvalidSocketId, "Connection closed");
        logger.error("WebSocket Error:\n\t", err);
        return next(err);
      }
    }

    next();
  });

  wsServer.on(
    "connection",
    handleWsError((socket) => {
      const userId = socket.handshake.query["userId"] as SocketData["userId"];

      logger.debug(`Connection made to: ${userId}`);
      connections.set(userId, socket.id);
      console.log(connections);

      socket.on(
        "disconnect",
        handleWsError(() => {
          logger.debug(`Disconnecting from: ${userId}`);
          connections.delete(userId);
        })
      );

      socket.on(
        EVENT_CHANGE_PROCESSED,
        handleWsError((clientId) => {
          logger.debug(`Client successfully processed updated: ${clientId}`);
        })
      );
    })
  );

  wsServer.engine.on("connection_error", (err: Error) => {
    logger.error(`Connection error: ${err.message}`);
  });

  return wsServer;
};
