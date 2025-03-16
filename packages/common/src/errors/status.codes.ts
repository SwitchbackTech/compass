/* https://httpstatuses.com/ */
export enum Status {
  /* 1xx - Information */
  /* 2xx - Success */
  OK = 200,
  NO_CONTENT = 204,

  /* 3xx - Redirection */
  /* 4xx - Client Error */
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  GONE = 410,

  /* 5xx - Server Error */
  INTERNAL_SERVER = 500,
  NOT_IMPLEMENTED = 501,

  /* 6xx - Custom */
  UNSURE = 600,
  REDUX_REFRESH_NEEDED = 601,
}
