import { Request, Response } from "express";
import { SessionRequest } from "supertokens-node/framework/express";

declare module "express-serve-static-core" {
  interface Request {
    session?: SessionRequest["session"];
  }

  interface Response {
    promise: (p: Promise<unknown> | (() => unknown) | unknown) => Response;
  }
}

export interface ReqBody<T> extends Request {
  body: T;
}

export interface Res_Promise extends Response {
  promise: Response["promise"];
}

export interface SReqBody<T> extends SessionRequest {
  body: T;
}

export interface SessionResponse extends Response {
  req: SessionRequest;
}
