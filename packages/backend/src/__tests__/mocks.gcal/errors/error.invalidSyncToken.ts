import { GaxiosError } from "gaxios";
import qs from "qs";

const requestHeaders = new Headers();
requestHeaders.set(
  "x-goog-api-client",
  "gdcl/6.0.4 gl-node/16.17.0 auth/8.7.0",
);
requestHeaders.set("Accept-Encoding", "gzip");
requestHeaders.set("User-Agent", "google-api-nodejs-client/6.0.4 (gzip)");
requestHeaders.set(
  "Authorization",
  "Bearer ya29.a0AVvZVsp98H_YLg9KeAZArECvxgVIMnVOQR_LIqkUMmTDi9qp8GBELy3GiDS0GhMo1mFDwsfJLsC4Ufup_AFi3eIrAPjU8d3FiX5M3wdOBeqXaG6miwlvOJDFd49QPi21nTIzKZojhi17TBhKNDiqLcHTWZl4aCgYKAecSARASFQGbdwaIncVRWWWmV5_XAYKqCOPaPg0163",
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
responseHeaders.set("date", "Thu, 02 Feb 2023 03:04:13 GMT");
responseHeaders.set("expires", "Mon, 01 Jan 1990 00:00:00 GMT");
responseHeaders.set("pragma", "no-cache");
responseHeaders.set("server", "ESF");
responseHeaders.set("transfer-encoding", "chunked");
responseHeaders.set("vary", "Origin, X-Origin, Referer");
responseHeaders.set("x-content-type-options", "nosniff");
responseHeaders.set("x-frame-options", "SAMEORIGIN");
responseHeaders.set("x-xss-protection", "0");

const error = new GaxiosError(
  "Sync token is no longer valid, a full sync is required.",
  {
    url: new URL(
      "https://www.googleapis.com/calendar/v3/calendars/foo%40gmail.com/events/watch?syncToken=1CKj765-V8_wCEKj765-V8_wCGAUghfra8AE%3D",
    ),
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
    headers: requestHeaders,
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
      url: new URL(
        "https://www.googleapis.com/calendar/v3/calendars/foo%40gmail.com/events/watch?syncToken=1CKj765-V8_wCEKj765-V8_wCGAUghfra8AE%3D",
      ),
      method: "POST",
      data: {
        address: "https://foo.yourdomain.app/api/sync/gcal/notifications",
        expiration: "1675307413038",
        id: "5af8c0d2-de66-4954-9860-ce43c7c60a22",
        token: "secret",
        type: "web_hook",
      },
      headers: requestHeaders,
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
    headers: responseHeaders,
    status: 410,
    statusText: "Gone",
    ok: false,
    redirected: false,
    type: "error" as ResponseType,
    url: "https://www.googleapis.com/calendar/v3/calendars/foo%40gmail.com/events/watch?syncToken=1CKj765-V8_wCEKj765-V8_wCGAUghfra8AE%3D",
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
error.code = "410";

export const invalidSyncTokenError = error;
