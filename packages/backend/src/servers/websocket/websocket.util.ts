import { Server as HttpServer } from "http";
import { type AddressInfo } from "node:net";
import { BaseError } from "@core/errors/errors.base";
import { Logger } from "@core/logger/winston.logger";

const logger = Logger("app:websocket.util");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type HandlerFunction<T extends any[], R> = (...args: T) => R | Promise<R>;

export const getServerUri = (httpServer: HttpServer) => {
  const port = (httpServer.address() as AddressInfo).port;
  return `http://localhost:${port}`;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const handleWsError = <T extends any[], R>(
  handler: HandlerFunction<T, R>,
) => {
  const handleError = (err: BaseError) => {
    logger.error("WebSocket Error:\n\t", err);
    throw err;
  };

  return (...args: T): R | void | Promise<R> => {
    try {
      const ret = handler(...args);
      const isHandlerAsync =
        ret && typeof (ret as Promise<R>).catch === "function";
      if (isHandlerAsync) {
        (ret as Promise<R>).catch(handleError);
      }
      return ret;
    } catch (e) {
      // sync handler
      handleError(e as BaseError);
    }
  };
};
