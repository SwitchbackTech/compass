import { type Request, type Response } from "express";
import { type AppConfig } from "@core/types/config.types";
import { CONFIG } from "@backend/common/constants/config.constants";
import configController from "./config.controller";
import { afterEach, describe, expect, it } from "bun:test";

// Capture what the controller writes via res.json without a real HTTP round-trip.
const invokeGet = (): AppConfig => {
  let captured: AppConfig | undefined;
  const res = {
    json: (body: AppConfig) => {
      captured = body;
    },
  } as unknown as Response;

  configController.get({} as Request<never, AppConfig, never, never>, res);

  if (!captured) {
    throw new Error("config controller did not respond");
  }

  return captured;
};

describe("ConfigController.get connectDelegatedToSync", () => {
  const originalRouting = CONFIG.SYNC_CONNECTION_ROUTING;
  const originalServiceUrl = CONFIG.SYNC_SERVICE_URL;
  const originalToken = CONFIG.SYNC_INTERNAL_AUTH_TOKEN;

  afterEach(() => {
    CONFIG.SYNC_CONNECTION_ROUTING = originalRouting;
    CONFIG.SYNC_SERVICE_URL = originalServiceUrl;
    CONFIG.SYNC_INTERNAL_AUTH_TOKEN = originalToken;
  });

  it("reports true when routing is sync and a sync client is configured", () => {
    // A sync client is built lazily from these two values; with routing=sync
    // and a client present, getConnectionDelegation() resolves to "sync".
    // This test file gets its own process, so the client singleton is primed
    // here rather than left null by an earlier legacy-path call.
    CONFIG.SYNC_SERVICE_URL = "http://sync.internal:4000";
    CONFIG.SYNC_INTERNAL_AUTH_TOKEN = "test-sync-secret";
    CONFIG.SYNC_CONNECTION_ROUTING = "sync";

    expect(invokeGet().google.connectDelegatedToSync).toBe(true);
  });
});
