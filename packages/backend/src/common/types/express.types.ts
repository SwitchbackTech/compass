import express from "express";
import { SessionRequest } from "supertokens-node/framework/express";
import { Request, Response } from "express";

export interface ReqBody<T> extends Request {
  body: T;
}

export interface Res_Promise extends express.Response {
  promise: (p: Promise<unknown> | (() => unknown) | any) => Express.Response;
}

export interface SReqBody<T> extends SessionRequest {
  body: T;
}

export interface SessionResponse extends Response {
  req: SessionRequest;
}
