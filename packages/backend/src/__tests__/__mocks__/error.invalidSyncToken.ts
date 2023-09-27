import qs from "qs";
import { GaxiosError } from "googleapis-common";

export const invalidSyncTokenError = new GaxiosError(
  "Sync token is no longer valid, a full sync is required.",
  {
    url: "https://www.googleapis.com/calendar/v3/calendars/foo%40gmail.com/events/watch?syncToken=1CKj765-V8_wCEKj765-V8_wCGAUghfra8AE%3D",
    method: "POST",
    paramsSerializer: (params) => {
      return qs.stringify(params, { arrayFormat: "repeat" });
    },
    data: {
      address: "https://foo.yourdomain.app/api/sync/gcal/notifications",
      expiration: "1675307413038",
      id: "5af8c0d2-de66-4954-9860-ce43c7c60a22",
      token: "secret",
      type: "web_hook",
    },
    headers: {
      "x-goog-api-client": "gdcl/6.0.4 gl-node/16.17.0 auth/8.7.0",
      "Accept-Encoding": "gzip",
      "User-Agent": "google-api-nodejs-client/6.0.4 (gzip)",
      Authorization:
        "Bearer ya29.a0AVvZVsp98H_YLg9KeAZArECvxgVIMnVOQR_LIqkUMmTDi9qp8GBELy3GiDS0GhMo1mFDwsfJLsC4Ufup_AFi3eIrAPjU8d3FiX5M3wdOBeqXaG6miwlvOJDFd49QPi21nTIzKZojhi17TBhKNDiqLcHTWZl4aCgYKAecSARASFQGbdwaIncVRWWWmV5_XAYKqCOPaPg0163",
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    params: {
      syncToken: "1CKj765-V8_wCEKj765-V8_wCGAUghfra8AE=",
    },
    validateStatus: (status) => {
      return (status >= 200 && status < 300) || status === 304;
    },
    retry: true,
    body: '{"address":"https://foo.yourdomain.app/api/sync/gcal/notifications","expiration":"1675307413038","id":"5af8c0d2-de66-4954-9860-ce43c7c60a22","token":"secretToken","type":"web_hook"}',
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
      url: "https://www.googleapis.com/calendar/v3/calendars/foo%40gmail.com/events/watch?syncToken=1CKj765-V8_wCEKj765-V8_wCGAUghfra8AE%3D",
      method: "POST",
      data: {
        address: "https://foo.yourdomain.app/api/sync/gcal/notifications",
        expiration: "1675307413038",
        id: "5af8c0d2-de66-4954-9860-ce43c7c60a22",
        token: "secret",
        type: "web_hook",
      },
      headers: {
        "x-goog-api-client": "gdcl/6.0.4 gl-node/16.17.0 auth/8.7.0",
        "Accept-Encoding": "gzip",
        "User-Agent": "google-api-nodejs-client/6.0.4 (gzip)",
        Authorization:
          "Bearer ya29.a0AVvZVsp98H_YLg9KeAZArECvxgVIMnVOQR_LIqkUMmTDi9qp8GBELy3GiDS0GhMo1mFDwsfJLsC4Ufup_AFi3eIrAPjU8d3FiX5M3wdOBeqXaG6miwlvOJDFd49QPi21nTIzKZojhi17TBhKNDiqLcHTWZl4aCgYKAecSARASFQGbdwaIncVRWWWmV5_XAYKqCOPaPg0163",
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      params: {
        syncToken: "1CKj765-V8_wCEKj765-V8_wCGAUghfra8AE=",
      },
      validateStatus: (status) => {
        return (status >= 200 && status < 300) || status === 304;
      },
      retry: true,
      body: '{"address":"https://foo.yourdomain.app/api/sync/gcal/notifications","expiration":"1675307413038","id":"5af8c0d2-de66-4954-9860-ce43c7c60a22","token":"somesecrettoke","type":"web_hook"}',
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
          {
            domain: "calendar",
            reason: "fullSyncRequired",
            message: "Sync token is no longer valid, a full sync is required.",
            locationType: "parameter",
            location: "syncToken",
          },
        ],
        code: 410,
        message: "Sync token is no longer valid, a full sync is required.",
      },
    },
    headers: {
      "alt-svc": 'h3=":443"; ma=2592000,h3-29=":443"; ma=2592000',
      "cache-control": "no-cache, no-store, max-age=0, must-revalidate",
      connection: "close",
      "content-encoding": "gzip",
      "content-type": "application/json; charset=UTF-8",
      date: "Thu, 02 Feb 2023 03:04:13 GMT",
      expires: "Mon, 01 Jan 1990 00:00:00 GMT",
      pragma: "no-cache",
      server: "ESF",
      "transfer-encoding": "chunked",
      vary: "Origin, X-Origin, Referer",
      "x-content-type-options": "nosniff",
      "x-frame-options": "SAMEORIGIN",
      "x-xss-protection": "0",
    },
    status: 410,
    statusText: "Gone",
    request: {
      responseURL:
        "https://www.googleapis.com/calendar/v3/calendars/foo%40gmail.com/events/watch?syncToken=1CKj765-V8_wCEKj765-V8_wCGAUghfra8AE%3D",
    },
  }
);
