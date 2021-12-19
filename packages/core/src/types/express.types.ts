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


export interface Res$Promise extends Express.Response {
    promise: (
      p: Promise<unknown> | (() => unknown)
    ) => Express.Response
}
