import express from "express";

import { handleExpressError } from "../errors/handlers/error.express.handler";
import { BaseError } from "../errors/errors.base";
import { Logger } from "../logger/common.logger";

const logger = Logger("app:promise.middleware");

export const catchUndefinedSyncErrors = (
  // err not provided, so create one
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const baseErr: BaseError = new BaseError(
    "Some Bad Sync Err Happened",
    `${req}`,
    500,
    false
  );
  res.promise(Promise.reject(baseErr));
};

export const catchSyncErrors = (
  // sync errors thrown by 3rd party libraries or by this app
  err: Error,
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  res.promise(Promise.reject(err));
};

const sendResponse = (res: express.Response, data: Record<string, unknown>) => {
  if (data !== null) {
    const code: number = data.statusCode || 200;
    res.status(code).send(data);
  } else {
    logger.error(`Sync error caught using this data: ${data}`);
    res.status(500).send("uh oh, no status");
  }
};

export function promiseMiddleware() {
  /* 
- turns everything into a promise, so you can have one place to 
handle both sync and async errors
- reduces how much error handling you have to do for controllers/services
*/
  return (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    res.promise = (p) => {
      //function or promise
      let promiseToResolve;

      if (p.then && p.catch) {
        promiseToResolve = p;
      } else if (typeof p === "function") {
        promiseToResolve = Promise.resolve().then(() => p());
      } else {
        promiseToResolve = Promise.resolve(p);
      }

      return promiseToResolve
        .then((data) => sendResponse(res, data))
        .catch((e) => handleExpressError(res, e));
    };

    return next();
  };
}
