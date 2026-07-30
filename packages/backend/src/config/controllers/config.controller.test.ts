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
  const originalServiceUrl = CONFIG.SYNC_SERVICE_URL;
  const originalToken = CONFIG.SYNC_INTERNAL_AUTH_TOKEN;

  afterEach(() => {
    CONFIG.SYNC_SERVICE_URL = originalServiceUrl;
    CONFIG.SYNC_INTERNAL_AUTH_TOKEN = originalToken;
  });

  it("reports true when a sync client is configured", () => {
    // A sync client is built lazily from these two values; with a client
    // present, getConnectionDelegation() resolves to "sync". This test file
    // gets its own process, so the client singleton is primed here rather
    // than left null by an earlier legacy-path call.
    CONFIG.SYNC_SERVICE_URL = "http://sync.internal:4000";
    CONFIG.SYNC_INTERNAL_AUTH_TOKEN = "test-sync-secret";

    expect(invokeGet().google.connectDelegatedToSync).toBe(true);
  });
});

describe("ConfigController.get sync cutover posture", () => {
  const originals = {
    cloudMutationMode: CONFIG.SYNC_CLOUD_MUTATION_MODE,
    execution: CONFIG.SYNC_EXECUTION,
  };

  afterEach(() => {
    CONFIG.SYNC_CLOUD_MUTATION_MODE = originals.cloudMutationMode;
    CONFIG.SYNC_EXECUTION = originals.execution;
  });

  it("exposes the two global cutover knobs", () => {
    CONFIG.SYNC_CLOUD_MUTATION_MODE = "maintenance";
    CONFIG.SYNC_EXECUTION = "passive";

    expect(invokeGet().sync).toEqual({
      cloudMutationMode: "maintenance",
      execution: "passive",
    });
  });
});
