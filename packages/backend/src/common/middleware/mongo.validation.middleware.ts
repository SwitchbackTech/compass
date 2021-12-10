import express from "express";
import { ObjectId } from "mongodb";

import { BaseError } from "../errors/errors.base";

export const validateIds = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const idsToCheck = [res.locals.user.id];
  if (req.params.id !== undefined) idsToCheck.push(req.params.id);

  idsToCheck.forEach((i: string | ObjectId) => {
    if (!ObjectId.isValid(i)) {
      const err = new BaseError(
        "Bad ID",
        `${i} is an invalid id (ObjectId or string)`,
        400,
        true
      );
      next(err);
    }
  });

  next();
};
