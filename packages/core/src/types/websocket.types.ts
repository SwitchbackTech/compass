import { Request } from "express";
import { Socket, Server as SocketIOServer } from "socket.io";
import { Schema_Event } from "@core/types/event.types";
import { UserMetadata } from "@core/types/user.types";

export interface ClientToServerEvents {
  EVENT_CHANGE_PROCESSED: () => void;
  SOMEDAY_EVENT_CHANGE_PROCESSED: () => void;
  FETCH_USER_METADATA: () => void;
}

export type CompassSocketServer = SocketIOServer<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

export type CompassSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

export interface InterServerEvents {
  EVENT_RECEIVED: (data: Schema_Event) => Schema_Event;
}

export interface ServerToClientEvents {
  EVENT_CHANGED: () => void;
  SOMEDAY_EVENT_CHANGED: () => void;
  USER_METADATA: (data: UserMetadata) => void;
  IMPORT_GCAL_START: () => void;
  IMPORT_GCAL_END: (reason?: string) => void;
  GOOGLE_REVOKED: () => void;
}

export interface SocketData {
  session: Exclude<Request["session"], undefined>;
}
