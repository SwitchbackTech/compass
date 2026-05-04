import {
  isBackendUnavailable,
  markBackendUnavailable,
  resetBackendAvailabilityForTests,
} from "../util/backend-unavailable-error.util";
import { BaseApi } from "./base.api";
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

const originalFetch = globalThis.fetch;

describe("BaseApi backend availability", () => {
  beforeEach(() => {
    BaseApi.defaults.adapter = undefined;
    resetBackendAvailabilityForTests();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    BaseApi.defaults.adapter = undefined;
    resetBackendAvailabilityForTests();
  });

  it("marks the backend unavailable when fetch cannot reach it", async () => {
    globalThis.fetch = mock(() =>
      Promise.reject(new TypeError("Failed to fetch")),
    ) as unknown as typeof fetch;

    await expect(BaseApi.get("/event")).rejects.toMatchObject({
      name: "ApiError",
    });

    expect(isBackendUnavailable()).toBe(true);
  });

  it("marks the backend available when a response arrives", async () => {
    markBackendUnavailable();
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response("{}", { status: 200 })),
    ) as unknown as typeof fetch;

    await BaseApi.get("/config");

    expect(isBackendUnavailable()).toBe(false);
  });
});
