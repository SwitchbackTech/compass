import { type ApiRequestConfig } from "../api.types";
import {
  isBackendUnavailable,
  markBackendUnavailable,
  resetBackendAvailabilityForTests,
} from "../util/backend-unavailable-error.util";
import { BaseApi } from "./base.api";
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

describe("BaseApi backend availability", () => {
  beforeEach(() => {
    BaseApi.defaults.adapter = undefined;
    BaseApi.defaults.onGoogleRevoked = undefined;
    resetBackendAvailabilityForTests();
  });

  afterEach(() => {
    BaseApi.defaults.adapter = undefined;
    BaseApi.defaults.onGoogleRevoked = undefined;
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

  it("forwards the configured Google revocation handler", async () => {
    const onGoogleRevoked = mock();
    BaseApi.defaults.onGoogleRevoked = onGoogleRevoked;
    BaseApi.defaults.adapter = async (config) => {
      throw Object.assign(new Error("Request failed"), {
        config,
        response: {
          config,
          data: { code: "GOOGLE_REVOKED" },
          headers: new Headers(),
          status: 401,
          statusText: "Unauthorized",
        },
      });
    };

    await expect(BaseApi.get("/event")).rejects.toMatchObject({
      message: "Request failed",
    });

    expect(onGoogleRevoked).toHaveBeenCalledTimes(1);
  });
});
