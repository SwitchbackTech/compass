import express from "express";
import { SessionRequest } from "supertokens-node/framework/express";
import { Res_Promise } from "@backend/common/types/express.types";
import { Logger } from "@core/logger/winston.logger";

import { handleExpressError } from "../errors/handlers/error.express.handler";

const logger = Logger("app:promise.middleware");

const sendResponse = (res: express.Response, data: Record<string, unknown>) => {
  if (data === null) {
    //todo extend to allow for sending no data, just success code?
    logger.error(`Sync error cuz no data provided for response`);
    res.status(500).send("uh oh, no data provided");
  }
  //@ts-ignore
  res.status(data?.statusCode || 200).send(data);
};

/*
 Turns everything into a promise, so you can have one place to 
 handle both sync and async errors, which
 reduces how much error handling you have to do for controllers/services
 */

type P = Promise<unknown> | (() => unknown);

export function promiseMiddleware() {
  return (
    _req: express.Request | SessionRequest,
    res: Res_Promise,
    next: express.NextFunction
  ) => {
    res.promise = (p: P) => {
      //function or promise
      let promiseToResolve: Promise<unknown> | (() => any);

      //@ts-ignore
      if (p.then && p.catch) {
        promiseToResolve = p;
      } else if (typeof p === "function") {
        promiseToResolve = Promise.resolve().then(() => p());
      } else {
        promiseToResolve = Promise.resolve(p);
      }

      return (
        promiseToResolve
          //@ts-ignore
          .then((data) => sendResponse(res, data))
          //@ts-ignore
          .catch((e) => handleExpressError(res, e))
      );
    };

    return next();
  };
}
