import express from "express";
import { BaseError } from "@core/errors/errors.base";
import { IS_DEV } from "@backend/common/constants/env.constants";

import { errorHandler } from "./error.handler";

/*
const invalidPathHandler = (
  //@ts-ignore
  req: express.Request,
  res: express.Request,
  next: express.NextFunction
) => {
  //@ts-ignore
  res.redirect("/error");
  next();
};
*/

interface Info_Error {
  name: string;
  message: string;
  stack?: string;
}

interface CompassError extends Error {
  status?: number;
}

export const handleExpressError = (
  res: express.Response,
  err: CompassError
) => {
  errorHandler.log(err);

  res.header("Content-Type", "application/json");
  if (err instanceof BaseError) {
    res.status(err.statusCode).send(err);
  } else {
    //TODO convert this object into one that has same keys as BaseError (?)
    const errInfo: Info_Error = {
      name: err.result,
      message: err.message,
      stack: undefined,
    };

    if (IS_DEV) {
      errInfo.stack = err.stack;
    }

    res.status(err.status || 500).send(errInfo);
  }

  if (!errorHandler.isOperational(err)) {
    errorHandler.exitAfterProgrammerError();
  }
};
