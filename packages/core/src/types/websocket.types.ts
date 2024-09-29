import { Server as SocketIOServer } from "socket.io";

import { Schema_Event } from "./event.types";

export interface ClientToServerEvents {
  EVENT_CHANGE_PROCESSED: (clientId: string) => void;
}

export type CompassSocketServer = SocketIOServer<
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
}

export interface SocketData {
  userId: string;
}
