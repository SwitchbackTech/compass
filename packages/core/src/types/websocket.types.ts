import { Schema_Event } from "./event.types";

export interface ClientToServerEvents {
  eventChangeProcessed: (clientId: string) => void;
}

export interface InterServerEvents {
  eventReceived: (data: Schema_Event) => Schema_Event;
}

export interface ServerToClientEvents {
  eventChanged: (data: Schema_Event) => void;
}

export interface SocketData {
  userId?: string;
}
