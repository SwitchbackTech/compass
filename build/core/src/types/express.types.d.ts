/// <reference types="express-serve-static-core" />
export interface ReqBody<T> extends Express.Request {
  body: T;
}
export interface Res extends Express.Response {
  locals: {
    user: {
      id: string;
    };
  };
}
export interface ResP<T> extends Express.Response {
  promise: T;
}
export interface Res_Promise extends Express.Response {
  promise: (p: Promise<unknown> | (() => unknown)) => Express.Response;
}
//# sourceMappingURL=express.types.d.ts.map
