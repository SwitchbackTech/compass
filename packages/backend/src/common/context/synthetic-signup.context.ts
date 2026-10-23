import type express from "express";
import {
  COMPASS_SYNTHETIC_ACCOUNT_HEADER,
  isSyntheticAccountHeaderValue,
} from "@core/analytics/synthetic-account.util";
import { AsyncLocalStorage } from "node:async_hooks";

const syntheticFromHeader = new AsyncLocalStorage<boolean>();

export function syntheticSignupHeaderMiddleware(): express.RequestHandler {
  return (req, _res, next) => {
    const flagged = isSyntheticAccountHeaderValue(
      req.headers[COMPASS_SYNTHETIC_ACCOUNT_HEADER],
    );
    syntheticFromHeader.run(flagged, () => next());
  };
}

export function isSyntheticSignupFromRequestHeader(): boolean {
  return syntheticFromHeader.getStore() === true;
}
