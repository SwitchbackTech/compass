import { Server as SocketIOServer } from "socket.io";

import { Schema_Event } from "./event.types";

export interface ClientToServerEvents {
  eventChangeProcessed: (clientId: string) => void;
}

export type CompassSocketServer = SocketIOServer<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;
export interface InterServerEvents {
  eventReceived: (data: Schema_Event) => Schema_Event;
}

export interface ServerToClientEvents {
  eventChanged: (data: Schema_Event) => void;
}

export interface SocketData {
  userId?: string;
}
