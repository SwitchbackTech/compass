import { Server as HttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import {
  EVENT_CHANGED,
  EVENT_CHANGE_PROCESSED,
  RESULT_IGNORED,
  RESULT_NOTIFIED_CLIENT,
} from "@core/constants/websocket.constants";
import { Logger } from "@core/logger/winston.logger";
import {
  ClientToServerEvents,
  CompassSocketServer,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from "@core/types/websocket.types";
import { ENV } from "@backend/common/constants/env.constants";
import { error } from "@backend/common/errors/handlers/error.handler";
import { SocketError } from "@backend/common/errors/socket/socket.errors";
import { handleWsError } from "./websocket.util";

const logger = Logger("app:websocket.server");

export class WebSocketServer {
  private connections: Map<string, string>;
  private wsServer?: CompassSocketServer;

  constructor() {
    this.connections = new Map<string, string>();
  }

  public init(server: HttpServer) {
    this.wsServer = new SocketIOServer<
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

    this.wsServer.use((socket, next) => {
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

    this.wsServer.on(
      "connection",
      handleWsError((socket) => {
        const userId = socket.handshake.query["userId"] as SocketData["userId"];

        logger.debug(`Connection made to: ${userId}`);
        this.connections.set(userId, socket.id);
        console.log(this.connections);

        socket.on(
          "disconnect",
          handleWsError(() => {
            logger.debug(`Disconnecting from: ${userId}`);
            this.connections.delete(userId);
          }),
        );

        socket.on(
          EVENT_CHANGE_PROCESSED,
          handleWsError((clientId) => {
            logger.debug(`Client successfully processed updated: ${clientId}`);
          }),
        );
      }),
    );

    this.wsServer.engine.on("connection_error", (err: Error) => {
      logger.error(`Connection error: ${err.message}`);
    });

    return this.wsServer;
  }

  public handleBackgroundCalendarChange(userId: string) {
    const socketId = this.connections.get(userId);

    const isClientConnected = socketId !== undefined;
    if (!isClientConnected) return RESULT_IGNORED;

    this.notifyClient(socketId, EVENT_CHANGED);
    return RESULT_NOTIFIED_CLIENT;
  }

  public addConnection(userId: string, socketId: string) {
    this.connections.set(userId, socketId);
  }

  public getConnection(userId: string): string | undefined {
    return this.connections.get(userId);
  }

  private notifyClient(socketId: string, event: keyof ServerToClientEvents) {
    if (this.wsServer === undefined) {
      throw error(SocketError.ServerNotReady, "Client not notified");
    }
    this.wsServer.to(socketId).emit(event);
  }
}

export const webSocketServer = new WebSocketServer();
