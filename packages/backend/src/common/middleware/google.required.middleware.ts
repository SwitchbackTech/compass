import { Request, Response } from "express";
import { NextFunction } from "express";
import { SessionRequest } from "supertokens-node/framework/express";
import { BaseError } from "@core/errors/errors.base";
import {
  errorHandler,
  toClientErrorPayload,
} from "@backend/common/errors/handlers/error.handler";
import { UserError } from "@backend/common/errors/user/user.errors";
import { requireGoogleConnection } from "@backend/common/guards/google.guard";

export const requireGoogleConnectionSession = async (
  req: SessionRequest,
  res: Response,
  next: NextFunction,
) => {
  const userId = req.session?.getUserId();

  if (!userId) {
    res
      .status(UserError.MissingUserIdField.status)
      .json(UserError.MissingUserIdField);
    return;
  }

  try {
    await requireGoogleConnection(userId);
  } catch (e) {
    if (e instanceof BaseError) {
      errorHandler.log(e);
      res.status(e.statusCode).json(toClientErrorPayload(e));
      return;
    }
    return next(e);
  }

  next();
};

export const requireGoogleConnectionFrom =
  (paramKey = "userId") =>
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.params[paramKey];

    if (!userId) {
      res
        .status(UserError.MissingUserIdField.status)
        .json(UserError.MissingUserIdField);
      return;
    }

    try {
      await requireGoogleConnection(userId);
    } catch (e) {
      if (e instanceof BaseError) {
        errorHandler.log(e);
        res.status(e.statusCode).json(toClientErrorPayload(e));
        return;
      }
      return next(e);
    }

    next();
  };
