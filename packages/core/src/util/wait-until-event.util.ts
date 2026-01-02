import type { EventEmitter2 } from "eventemitter2";
import type EventEmitter from "node:events";
import type { Server } from "node:http";
import type { Socket } from "socket.io";
import type { Socket as Client } from "socket.io-client";
import type {
  CompassSocket,
  CompassSocketServer,
} from "@core/types/websocket.types";

export async function waitUntilEvent<
  Payload extends unknown[],
  Result = Payload,
>(
  emitter: Pick<
    | Socket
    | CompassSocket
    | Client
    | Server
    | CompassSocketServer
    | EventEmitter
    | EventEmitter2,
    "once"
  >,
  event: Parameters<(typeof emitter)["once"]>["0"],
  timeoutMs: number = 2000,
  beforeEvent: () => Promise<unknown> = () => Promise.resolve(),
  afterEvent: (...args: Payload) => Promise<Result> = (...args) =>
    Promise.resolve(args as unknown as Result),
): Promise<Result> {
  return new Promise((resolve, reject) => {
    const eventEmitter = emitter as EventEmitter;

    const timeout = setTimeout(() => {
      clearTimeout(timeout);

      eventEmitter.removeListener?.(event as string, listener);

      reject(
        new Error(`Operation timed out. Wait for ${String(event)} timed out`),
      );
    }, timeoutMs);

    const listener = (...payload: Payload) => {
      afterEvent(...payload).then(resolve);
      clearTimeout(timeout);
    };

    eventEmitter.once(event as string, listener);

    beforeEvent?.().catch((error) => {
      eventEmitter.removeListener?.(event as string, listener);
      reject(error);
    });
  });
}
