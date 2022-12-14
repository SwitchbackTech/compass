// @ts-nocheck
import express from "express";
import { Res_Promise } from "@core/types/express.types";
import { BaseError } from "@core/errors/errors.base";
import { Logger } from "@core/logger/winston.logger";

import { handleExpressError } from "../errors/handlers/error.express.handler";

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
  //@ts-ignore
  res.promise(Promise.reject(baseErr));
};

export const catchSyncErrors = (
  // sync errors thrown by 3rd party libraries or by this app
  err: Error,
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  //@ts-ignore
  res.promise(Promise.reject(err));
};

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
    // req: express.Request,
    req: SessionRequest,
    // res: express.Response,
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

      //@ts-ignore
      return promiseToResolve
        .then((data) => sendResponse(res, data))
        .catch((e) => handleExpressError(res, e));
    };

    return next();
  };
}
