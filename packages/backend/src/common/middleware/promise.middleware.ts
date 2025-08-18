import express from "express";
import { SessionRequest } from "supertokens-node/framework/express";
import { Logger } from "@core/logger/winston.logger";
import { handleExpressError } from "@backend/common/errors/handlers/error.express.handler";
import { Res_Promise } from "@backend/common/types/express.types";

const logger = Logger("app:promise.middleware");

interface D extends Record<string, unknown> {
  statusCode: number;
}

const sendResponse = (res: express.Response, data: D) => {
  if (data === null) {
    logger.error(`No data provided for response`);
    res.status(500).send("uh oh, no data provided");
  }
  res.status(data.statusCode || 200).send(data);
};

/*
 Turns everything into a promise, so you can have one place to
 handle both sync and async errors
 */
type SyncFunction = (...args: unknown[]) => unknown;

export const requestMiddleware = () => {
  return (
    req: express.Request | SessionRequest,
    res: Res_Promise,
    next: express.NextFunction,
  ) => {
    res.promise = (p: Promise<unknown> | SyncFunction | unknown) => {
      let toResolve: Promise<unknown> | (() => unknown);

      if (p instanceof Promise) {
        toResolve = p;
      } else if (typeof p === "function") {
        toResolve = Promise.resolve().then(() => p());
      } else {
        toResolve = Promise.resolve(p);
      }

      toResolve
        .then((data) => sendResponse(res, data as D))
        .catch((e) => handleExpressError(req, res, e));

      return res;
    };

    return next();
  };
};
