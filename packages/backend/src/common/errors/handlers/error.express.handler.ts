import express from "express";

import { BaseError } from "@core/errors/errors.base";

import { errorHandler } from "./error.handler";
import { isDev } from "../../helpers/common.helpers";

const invalidPathHandler = (
  req: express.Request,
  res: express.Request,
  next: express.NextFunction
) => {
  res.redirect("/error");
};

export const handleExpressError = (res: express.Response, err: Error) => {
  errorHandler.log(err);

  res.header("Content-Type", "application/json");
  if (err instanceof BaseError) {
    res.status(err.statusCode).send(err);
  } else {
    //TODO convert this object into one that has same keys as BaseError (?)
    const errInfo = { name: err.name, message: err.message };
    if (isDev()) {
      errInfo.stack = err.stack;
    }
    res.status(err.status || 500).send(errInfo);
  }

  if (!errorHandler.isOperational(err)) {
    errorHandler.exitAfterProgrammerError();
  }
};
