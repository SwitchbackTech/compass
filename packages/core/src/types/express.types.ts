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
