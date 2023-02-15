import { SessionRequest } from "supertokens-node/framework/express";
import { Request, Response } from "express";

export interface ReqBody<T> extends Request {
  body: T;
}
export interface Res extends Response {
  locals: {
    user: {
      id: string;
    };
  };
  // TODO figure out how to generalize this so it can take
  // multiple types, but doesn't need every arg to be hard-coded
  // promise: Promise<unknown> | (() => unknown)
}

export interface ResP<T> extends Response {
  promise: T;
}

export interface Res_Promise extends Response {
  promise: (p: Promise<unknown> | (() => unknown)) => Express.Response;
}

export interface SReqBody<T> extends SessionRequest {
  body: T;
}

export interface SessionResponse extends Response {
  req: SessionRequest;
}
