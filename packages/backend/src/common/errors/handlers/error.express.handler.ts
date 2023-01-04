import { GaxiosError } from "googleapis-common";
import { Response } from "express";
import { BaseError } from "@core/errors/errors.base";
import { IS_DEV } from "@backend/common/constants/env.constants";
import { isAccessRevoked } from "@backend/common/services/gcal/gcal.utils";
import { Status } from "@core/errors/status.codes";
import userService from "@backend/user/services/user.service";

import { errorHandler } from "./error.handler";

interface Info_Error {
  name?: string;
  message: string;
  stack?: string;
}

interface CompassError extends Error {
  name: string;
  result?: string;
  stack?: string;
  status?: number;
}

export const handleExpressError = async (res: Response, err: CompassError) => {
  res.header("Content-Type", "application/json");

  if (err instanceof BaseError) {
    errorHandler.log(err);
    res.status(err.statusCode).send(err);
  } else {
    const isGoogleError = err instanceof GaxiosError;

    if (isGoogleError && isAccessRevoked(err)) {
      //@ts-ignore
      const userId = res.req.session?.getUserId() as string;
      console.warn(`User revoked access, cleaning data: ${userId}`);

      await userService.deleteCompassDataForUser(userId, false);

      res.status(Status.GONE).send("User revoked access, deleted all data");
      return;
    }

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
