export interface ReqBody<T> extends Express.Request {
  body: T;
}
export interface Res extends Express.Response {
  locals: {
    user: {
      id: string;
    };
  };
  // TODO figure out how to generalize this so it can take
  // multiple types, but doesn't need every arg to be hard-coded
  // promise: Promise<unknown> | (() => unknown)
}

export interface ResP<T> extends Express.Response {
  promise: T;
}

export interface Res_Promise extends Express.Response {
  promise: (p: Promise<unknown> | (() => unknown)) => Express.Response;
}
