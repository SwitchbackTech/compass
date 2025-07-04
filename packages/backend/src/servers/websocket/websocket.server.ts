import { Request } from "express";
import { Server as HttpServer } from "node:http";
import { ExtendedError, Server as SocketIOServer } from "socket.io";
import { verifySession } from "supertokens-node/recipe/session/framework/express";
import {
  EVENT_CHANGED,
  EVENT_CHANGE_PROCESSED,
  FETCH_USER_METADATA,
  IMPORT_GCAL_END,
  IMPORT_GCAL_START,
  RESULT_IGNORED,
  RESULT_NOTIFIED_CLIENT,
  USER_METADATA,
  USER_REFRESH_TOKEN,
  USER_SIGN_OUT,
} from "@core/constants/websocket.constants";
import { Logger } from "@core/logger/winston.logger";
import { UserMetadata } from "@core/types/user.types";
import {
  ClientToServerEvents,
  CompassSocket,
  CompassSocketServer,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from "@core/types/websocket.types";
import { ENV } from "@backend/common/constants/env.constants";
import { error } from "@backend/common/errors/handlers/error.handler";
import { SocketError } from "@backend/common/errors/socket/socket.errors";
import { handleWsError } from "@backend/servers/websocket/websocket.util";
import userService from "@backend/user/services/user.service";

const logger = Logger("app:websocket.server");

class WebSocketServer {
  #sessionConnections = new Map<string, string>();
  #userConnections = new Map<string, string[]>();

  private wsServer?: CompassSocketServer;

  private onConnection(socket: CompassSocket) {
    const userId = socket.data.session.getUserId();

    const sessionSocketId =
      socket.data.session.getAccessTokenPayload().sessionHandle;

    const userConnections = this.#userConnections.get(userId!) ?? [];

    this.#sessionConnections.set(sessionSocketId, socket.id);
    this.#userConnections.set(userId!, userConnections?.concat(socket.id));

    logger.debug(`Connection made to: ${socket.id}`);

    console.log(this.#sessionConnections);

    socket.on(
      "disconnect",
      handleWsError(this.onDisconnect({ socket, userId, sessionSocketId })),
    );

    socket.on(
      EVENT_CHANGE_PROCESSED,
      handleWsError(() => {
        logger.debug(`Client successfully processed updated: ${socket.id}`);
      }),
    );

    socket.on(
      FETCH_USER_METADATA,
      handleWsError(() =>
        userService
          .fetchUserMetadata(socket.data.session!.getUserId()!)
          .then((data) => this.handleUserMetadata(sessionSocketId, data)),
      ),
    );
  }

  private onDisconnect({
    socket,
    userId,
    sessionSocketId,
  }: {
    socket: CompassSocket;
    userId: string;
    sessionSocketId: string;
  }): () => void {
    return () => {
      logger.debug(`Disconnecting from: ${socket.id}`);

      const userConnections = this.#userConnections.get(userId!)!;

      this.#sessionConnections.delete(sessionSocketId!);

      this.#userConnections.set(
        userId!,
        userConnections.filter((id) => id !== socket.id),
      );

      console.log(this.#sessionConnections);
    };
  }

  private bindSessionToSocket(
    socket: CompassSocket,
    next: (err?: ExtendedError) => void,
  ) {
    try {
      const session = (socket.request as Request).session;

      if (!session) {
        return next(error(SocketError.SessionNotFound, "Session not found"));
      }

      socket.data.session = session;

      next();
    } catch (error) {
      logger.error("WebSocket Error:\n\t", error);
      return next(error as ExtendedError);
    }
  }

  private generateId(req: Request): string {
    return req.session?.getAccessTokenPayload()?.sessionHandle;
  }

  private notifyClient(
    socketId: string,
    event: keyof ServerToClientEvents,
    ...payload: Parameters<ServerToClientEvents[typeof event]>
  ) {
    if (this.wsServer === undefined) {
      throw error(SocketError.ServerNotReady, "Client not notified");
    }

    const socket = this.wsServer.sockets.sockets.get(socketId);

    const isClientConnected = socket?.connected;

    if (!isClientConnected) return RESULT_IGNORED;

    socket.emit(event, ...payload);

    return RESULT_NOTIFIED_CLIENT;
  }

  /*
   * notifyUser
   *
   * Notify all the sessions of an active user
   * all logged in device sessions for this user
   *
   * @private
   *
   * @memberOf WebSocketServer
   */
  private notifyUser(
    userId: string,
    event: keyof ServerToClientEvents,
    ...payload: Parameters<ServerToClientEvents[typeof event]>
  ) {
    return this.#userConnections
      .get(userId)
      ?.map((socketId) => this.notifyClient(socketId, event, ...payload));
  }

  /*
   * notifySession
   *
   * Notify a specific session of an active user
   * single logged in user device session
   *
   * @private
   *
   * @memberOf WebSocketServer
   */
  private notifySession(
    sessionSocketId: string,
    event: keyof ServerToClientEvents,
    ...payload: Parameters<ServerToClientEvents[typeof event]>
  ) {
    const socketId = this.#sessionConnections.get(sessionSocketId);

    return this.notifyClient(socketId!, event, ...payload);
  }

  init(server: HttpServer) {
    this.wsServer = new SocketIOServer<
      ClientToServerEvents,
      ServerToClientEvents,
      InterServerEvents,
      SocketData
    >(server, { cors: { origin: ENV.ORIGINS_ALLOWED, credentials: true } });

    this.wsServer.engine.use(verifySession());

    this.wsServer.engine.generateId = this.generateId.bind(this);

    this.wsServer.use(this.bindSessionToSocket.bind(this));

    this.wsServer.on("connection", handleWsError(this.onConnection.bind(this)));

    this.wsServer.engine.on("connection_error", (err: Error) => {
      logger.error(`Connection error: ${err.message}`);
    });

    return this.wsServer;
  }

  handleUserSignOut(sessionSocketId: string) {
    return this.notifySession(sessionSocketId, USER_SIGN_OUT);
  }

  handleUserRefreshToken(sessionSocketId: string) {
    return this.notifySession(sessionSocketId, USER_REFRESH_TOKEN);
  }

  handleUserMetadata(sessionSocketId: string, payload: UserMetadata) {
    return this.notifySession(sessionSocketId, USER_METADATA, payload);
  }

  handleImportGCalStart(userId: string) {
    return this.notifyUser(userId, IMPORT_GCAL_START);
  }

  handleImportGCalEnd(userId: string, payload?: string) {
    return this.notifyUser(userId, IMPORT_GCAL_END, payload);
  }

  handleBackgroundCalendarChange(userId: string) {
    return this.notifyUser(userId, EVENT_CHANGED);
  }
}

export const webSocketServer = new WebSocketServer();
