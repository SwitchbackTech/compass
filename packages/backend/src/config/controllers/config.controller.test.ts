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

    expect(invokeGet().sync).toEqual({
      cloudMutationMode: "maintenance",
      execution: "passive",
    });
  });
});
