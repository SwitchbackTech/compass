import { type ApiRequestConfig } from "../api.types";
import {
  isBackendUnavailable,
  markBackendUnavailable,
  resetBackendAvailabilityForTests,
} from "../util/backend-unavailable-error.util";
import { BaseApi } from "./base.api";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";

describe("BaseApi backend availability", () => {
  beforeEach(() => {
    BaseApi.defaults.adapter = undefined;
    resetBackendAvailabilityForTests();
  });

  afterEach(() => {
    BaseApi.defaults.adapter = undefined;
    resetBackendAvailabilityForTests();
  });

  it("marks the backend unavailable when fetch cannot reach it", async () => {
    BaseApi.defaults.adapter = async () => {
      throw new TypeError("Failed to fetch");
    };

    await expect(BaseApi.get("/event")).rejects.toMatchObject({
      name: "ApiError",
    });

    expect(isBackendUnavailable()).toBe(true);
  });

  it("does not mark the backend unavailable for non-network request failures", async () => {
    BaseApi.defaults.adapter = async () => {
      throw new Error("Unexpected adapter failure");
    };

    await expect(BaseApi.get("/event")).rejects.toMatchObject({
      name: "ApiError",
    });

    expect(isBackendUnavailable()).toBe(false);
  });

  it("marks the backend available when a response arrives", async () => {
    markBackendUnavailable();
    BaseApi.defaults.adapter = async <T>(
      config: ApiRequestConfig & { body?: unknown },
    ) => ({
      config,
      data: {} as T,
      headers: new Headers(),
      status: 200,
      statusText: "OK",
    });

    await BaseApi.get("/config");

    expect(isBackendUnavailable()).toBe(false);
  });
});
