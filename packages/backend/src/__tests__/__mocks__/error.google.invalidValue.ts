import { GaxiosError } from "googleapis-common";

export const invalidValueError = new GaxiosError(
  "Invalid Value",
  {
    url: "https://www.googleapis.com/calendar/v3/calendars/foo%40gmail.com/events/watch?syncToken=x",
    method: "POST",
    data: {
      address: "https://foo.yourdomain.app/api/sync/gcal/notifications",
      expiration: "1675961300771",
      id: "b69deec8-8526-4504-b376-db83295df0f0",
      token: "secret",
      type: "web_hook",
    },
    headers: {
      "x-goog-api-client": "gdcl/6.0.4 gl-node/16.17.0 auth/8.7.0",
      "Accept-Encoding": "gzip",
      "User-Agent": "google-api-nodejs-client/6.0.4 (gzip)",
      Authorization:
        "Bearer ya29.a0AVvZVsr4Nv76zYXg0JPCTWTEc37yn0qUyDu35T6AGiv9ucvLsbMZWQ_zk5eKa2bBqiiOCHp4go1Wkml1-paDG0Aayaf-4XeQd8nm78STjMYNk7cEXL8K5jlHTO3Um1VJtPm4yW-ful6ytXn22ULPzzxlahwQaCgYKAZISARASFQGbdwaIn48X7svG7sifNvemifZazw0163",
      "Content-Type": "application/json",
      Accept: "application/json",
    },
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
      url: "https://www.googleapis.com/calendar/v3/calendars/foo%40gmail.com/events/watch?syncToken=x",
      method: "POST",
      data: {
        address: "https://foo.yourdomain.app/api/sync/gcal/notifications",
        expiration: "1675961300771",
        id: "b69deec8-8526-4504-b376-db83295df0f0",
        token: "secret",
        type: "web_hook",
      },
      headers: {
        "x-goog-api-client": "gdcl/6.0.4 gl-node/16.17.0 auth/8.7.0",
        "Accept-Encoding": "gzip",
        "User-Agent": "google-api-nodejs-client/6.0.4 (gzip)",
        Authorization:
          "Bearer ya29.a0AVvZVsr4Nv76zYXg0JPCTWTEc37yn0qUyDu35T6AGiv9ucvLsbMZWQ_zk5eKa2bBqiiOCHp4go1Wkml1-paDG0Aayaf-4XeQd8nm78STjMYNk7cEXL8K5jlHTO3Um1VJtPm4yW-ful6ytXn22ULPzzxlahwQaCgYKAZISARASFQGbdwaIn48X7svG7sifNvemifZazw0163",
        "Content-Type": "application/json",
        Accept: "application/json",
      },
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
    headers: {
      "alt-svc": 'h3=":443"; ma=2592000,h3-29=":443"; ma=2592000',
      "cache-control": "no-cache, no-store, max-age=0, must-revalidate",
      connection: "close",
      "content-encoding": "gzip",
      "content-type": "application/json; charset=UTF-8",
      date: "Thu, 09 Feb 2023 16:42:21 GMT",
      expires: "Mon, 01 Jan 1990 00:00:00 GMT",
      pragma: "no-cache",
      server: "ESF",
      "transfer-encoding": "chunked",
      vary: "Origin, X-Origin, Referer",
      "x-content-type-options": "nosniff",
      "x-frame-options": "SAMEORIGIN",
      "x-xss-protection": "0",
    },
    status: 400,
    statusText: "Bad Request",
    request: {
      responseURL:
        "https://www.googleapis.com/calendar/v3/calendars/foo%40gmail.com/events/watch?syncToken=x",
    },
  }
);
