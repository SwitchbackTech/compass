import { handleExpressError } from "@backend/common/errors/handlers/error.express.handler";
import { type Res_Promise } from "@backend/common/types/express.types";
import { Status } from "@core/errors/status.codes";
import { Logger } from "@core/logger/winston.logger";
import type express from "express";
import { type SessionRequest } from "supertokens-node/framework/express";

const logger = Logger("app:promise.middleware");

interface StatusPayload extends Record<string, unknown> {
  statusCode: number;
}

const hasStatusCode = (data: unknown): data is StatusPayload =>
  typeof data === "object" &&
  data !== null &&
  "statusCode" in data &&
  typeof data.statusCode === "number";

const isStatusOnlyPayload = (data: unknown): data is StatusPayload =>
  hasStatusCode(data) && Object.keys(data).length === 1;

const sendResponse = (res: express.Response, data: unknown) => {
  if (data === null) {
    logger.error(`No data provided for response`);
    res.status(500).send("uh oh, no data provided");
    return;
  }

  if (isStatusOnlyPayload(data) && data.statusCode === Status.NO_CONTENT) {
    res.status(Status.NO_CONTENT).send();
    return;
  }

  res.status(hasStatusCode(data) ? data.statusCode : Status.OK).send(data);
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
        .then((data) => sendResponse(res, data))
        .catch((e) => handleExpressError(req, res, e));

      return res;
    };

    return next();
  };
};
