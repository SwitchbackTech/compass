import { GaxiosError } from "gaxios";

const requestHeaders = new Headers();
requestHeaders.set(
  "x-goog-api-client",
  "gdcl/6.0.4 gl-node/16.17.0 auth/8.7.0",
);
requestHeaders.set("Accept-Encoding", "gzip");
requestHeaders.set("User-Agent", "google-api-nodejs-client/6.0.4 (gzip)");
requestHeaders.set(
  "Authorization",
  "Bearer ya29.a0AVvZVsr4Nv76zYXg0JPCTWTEc37yn0qUyDu35T6AGiv9ucvLsbMZWQ_zk5eKa2bBqiiOCHp4go1Wkml1-paDG0Aayaf-4XeQd8nm78STjMYNk7cEXL8K5jlHTO3Um1VJtPm4yW-ful6ytXn22ULPzzxlahwQaCgYKAZISARASFQGbdwaIn48X7svG7sifNvemifZazw0163",
);
requestHeaders.set("Content-Type", "application/json");
requestHeaders.set("Accept", "application/json");

const responseHeaders = new Headers();
responseHeaders.set(
  "alt-svc",
  'h3=":443"; ma=2592000,h3-29=":443"; ma=2592000',
);
responseHeaders.set(
  "cache-control",
  "no-cache, no-store, max-age=0, must-revalidate",
);
responseHeaders.set("connection", "close");
responseHeaders.set("content-encoding", "gzip");
responseHeaders.set("content-type", "application/json; charset=UTF-8");
responseHeaders.set("date", "Thu, 09 Feb 2023 16:42:21 GMT");
responseHeaders.set("expires", "Mon, 01 Jan 1990 00:00:00 GMT");
responseHeaders.set("pragma", "no-cache");
responseHeaders.set("server", "ESF");
responseHeaders.set("transfer-encoding", "chunked");
responseHeaders.set("vary", "Origin, X-Origin, Referer");
responseHeaders.set("x-content-type-options", "nosniff");
responseHeaders.set("x-frame-options", "SAMEORIGIN");
responseHeaders.set("x-xss-protection", "0");

const error = new GaxiosError(
  "Invalid Value",
  {
    url: new URL(
      "https://www.googleapis.com/calendar/v3/calendars/foo%40gmail.com/events/watch?syncToken=x",
    ),
    method: "POST",
    data: {
      address: "https://foo.yourdomain.app/api/sync/gcal/notifications",
      expiration: "1675961300771",
      id: "b69deec8-8526-4504-b376-db83295df0f0",
      token: "secret",
      type: "web_hook",
    },
    headers: requestHeaders,
    params: { syncToken: "x" },
    retry: true,
    body: '{"address":"https://foo.yourdomain.app/api/sync/gcal/notifications","expiration":"1675961300771","id":"b69deec8-8526-4504-b376-db83295df0f0","token":"secret","type":"web_hook"}',
    responseType: "json",
    retryConfig: {
      currentRetryAttempt: 0,
      retry: 3,
      httpMethodsToRetry: ["GET", "HEAD", "PUT", "OPTIONS", "DELETE"],
      noResponseRetries: 2,
      statusCodesToRetry: [
        [100, 199],
        [429, 429],
        [500, 599],
      ],
    },
  },
  {
    config: {
      url: new URL(
        "https://www.googleapis.com/calendar/v3/calendars/foo%40gmail.com/events/watch?syncToken=x",
      ),
      method: "POST",
      data: {
        address: "https://foo.yourdomain.app/api/sync/gcal/notifications",
        expiration: "1675961300771",
        id: "b69deec8-8526-4504-b376-db83295df0f0",
        token: "secret",
        type: "web_hook",
      },
      headers: requestHeaders,
      params: { syncToken: "x" },
      retry: true,
      body: '{"address":"https://foo.yourdomain.app/api/sync/gcal/notifications","expiration":"1675961300771","id":"b69deec8-8526-4504-b376-db83295df0f0","token":"secret","type":"web_hook"}',
      responseType: "json",
      retryConfig: {
        currentRetryAttempt: 0,
        retry: 3,
        httpMethodsToRetry: ["GET", "HEAD", "PUT", "OPTIONS", "DELETE"],
        noResponseRetries: 2,
        statusCodesToRetry: [
          [100, 199],
          [429, 429],
          [500, 599],
        ],
      },
    },
    data: {
      error: {
        errors: [
          { domain: "global", reason: "invalid", message: "Invalid Value" },
        ],
        code: 400,
        message: "Invalid Value",
      },
    },
    headers: responseHeaders,
    status: 400,
    statusText: "Bad Request",
    ok: false,
    redirected: false,
    type: "error" as ResponseType,
    url: "https://www.googleapis.com/calendar/v3/calendars/foo%40gmail.com/events/watch?syncToken=x",
    body: null,
    bodyUsed: false,
    clone: () => {
      throw new Error("Not implemented");
    },
    arrayBuffer: async () => {
      throw new Error("Not implemented");
    },
    blob: async () => {
      throw new Error("Not implemented");
    },
    formData: async () => {
      throw new Error("Not implemented");
    },
    json: async () => ({
      error: {
        errors: [
          { domain: "global", reason: "invalid", message: "Invalid Value" },
        ],
        code: 400,
        message: "Invalid Value",
      },
    }),
    text: async () => {
      throw new Error("Not implemented");
    },
    bytes: async () => {
      throw new Error("Not implemented");
    },
  },
);

// Set the code property to match the HTTP status
error.code = "400";

export const invalidValueError = error;
