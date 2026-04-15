import { type EventEmitter2 } from "eventemitter2";
import type EventEmitter from "node:events";
import { type Server } from "node:http";

export async function waitUntilEvent<
  Payload extends unknown[],
  Result = Payload,
>(
  emitter: Pick<Server | EventEmitter | EventEmitter2, "once">,
  event: Parameters<(typeof emitter)["once"]>["0"],
  timeoutMs: number = 2000,
  beforeEvent: () => Promise<unknown> = () => Promise.resolve(),
  afterEvent: (...args: Payload) => Promise<Result> = (...args) =>
    Promise.resolve(args as unknown as Result),
): Promise<Result> {
  return new Promise((resolve, reject) => {
    const eventEmitter = emitter as EventEmitter;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const listener = (...payload: any[]) => {
      afterEvent(...(payload as Payload))
        .then(resolve)
        .catch(reject);
      clearTimeout(timeout);
    };

    const timeout = setTimeout(() => {
      clearTimeout(timeout);

      eventEmitter.removeListener?.(event as string, listener);

      reject(
        new Error(`Operation timed out. Wait for ${String(event)} timed out`),
      );
    }, timeoutMs);

    eventEmitter.once(event as string, listener);

    beforeEvent?.().catch((error: unknown) => {
      eventEmitter.removeListener?.(event as string, listener);
      reject(error instanceof Error ? error : new Error(String(error)));
    });
  });
}
