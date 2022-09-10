import express from "express";
import { ObjectId } from "mongodb";
import { SessionRequest } from "supertokens-node/framework/express";

import { error, DbError } from "../errors/types/backend.errors";

export const validateIdParam = (
  req: SessionRequest,
  res: express.Response,
  next: express.NextFunction
) => {
  const idParam = req.params["id"] as string;

  if (!ObjectId.isValid(idParam)) {
    const err = error(DbError.InvalidId, "Request Failed");
    res.status(err.statusCode).json({ error: err });
  }

  next();
};
