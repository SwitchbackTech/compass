import express from "express";
import { Res_Promise } from "@core/types/express.types";
export declare const catchUndefinedSyncErrors: (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => void;
export declare const catchSyncErrors: (
  err: Error,
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => void;
export declare function promiseMiddleware(): (
  req: express.Request,
  res: Res_Promise,
  next: express.NextFunction
) => void;
//# sourceMappingURL=promise.middleware.d.ts.map
