import express from "express";
import { ObjectId } from "mongodb";
import { SessionRequest } from "supertokens-node/framework/express";

import { error, DbError } from "../errors/types/backend.errors";

export const validateIdParam = (
  req: SessionRequest,
  res: express.Response,
  next: express.NextFunction
) => {
  //--
  // const idsToCheck = [res.locals["user"]["id"]];
  // if (req.params.id !== undefined) idsToCheck.push(req.params.id);
  // const idsToCheck = [req.params["id"]];
  // if (idParam === undefined) {
  //   const err = error(ValidationError.MissingIdParam, "Request Failed");
  //   // next(err);
  //   return res.status(err.statusCode).json({ error: err });
  // }
  const idParam = req.params["id"] as string;

  if (!ObjectId.isValid(idParam)) {
    const err = error(DbError.InvalidId, "Request Failed");
    return res.status(err.statusCode).json({ error: err });
  }

  next();
};
