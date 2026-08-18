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

    const config = invokeGet();
    expect(config.sync).toEqual({
      cloudMutationMode: "maintenance",
      execution: "passive",
    });
    expect(config.billing).toEqual({
      isConfigured: false,
      enforcement: false,
      priceDisplay: "$7.99/month",
      trialLengthDays: 7,
    });
  });
});

describe("ConfigController.get billing enforcement", () => {
  const original = CONFIG.BILLING_ENFORCEMENT;

  afterEach(() => {
    CONFIG.BILLING_ENFORCEMENT = original;
  });

  it("defaults to paused", () => {
    CONFIG.BILLING_ENFORCEMENT = false;
    expect(invokeGet().billing.enforcement).toBe(false);
  });

  it("reports true once the operator enables it", () => {
    CONFIG.BILLING_ENFORCEMENT = true;
    expect(invokeGet().billing.enforcement).toBe(true);
  });
});
