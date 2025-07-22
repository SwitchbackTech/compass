import type EventEmitter from "node:events";
import type { Server } from "node:http";
import type { Socket } from "socket.io";
import type { Socket as Client } from "socket.io-client";
import {
  CompassSocket,
  CompassSocketServer,
} from "@core/types/websocket.types";
import { GenericError } from "@backend/common/errors/generic/generic.errors";
import { error } from "@backend/common/errors/handlers/error.handler";

export const yearsAgo = (numYears: number) => {
  return new Date(new Date().setFullYear(new Date().getFullYear() - numYears));
};

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
    | EventEmitter,
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

      eventEmitter.removeListener(event, listener);

      reject(
        error(
          GenericError.OperationTimeout,
          `wait for ${String(event)} timed out`,
        ),
      );
    }, timeoutMs);

    const listener = (...payload: Payload) => {
      afterEvent(...payload).then(resolve);
      clearTimeout(timeout);
    };

    eventEmitter.once(event, listener);

    beforeEvent().catch((error) => {
      eventEmitter.removeListener(event, listener);
      reject(error);
    });
  });
}
