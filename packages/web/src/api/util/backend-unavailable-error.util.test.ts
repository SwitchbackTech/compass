import { Status } from "@core/errors/status.codes";
import { type ApiError, type ApiResponse } from "../api.types";
import {
  isBackendUnavailable,
  isBackendUnavailableError,
  markBackendAvailable,
  markBackendUnavailable,
  resetBackendAvailabilityForTests,
} from "./backend-unavailable-error.util";

/** Mirrors what `createApiError` builds for a response the backend/proxy returned. */
const createApiErrorWithStatus = (status: number): ApiError => {
  const error = new Error(`Request failed with status ${status}`) as ApiError;
  error.name = "ApiError";
  error.response = { status } as ApiResponse<unknown>;
  return error;
};

beforeEach(() => {
  resetBackendAvailabilityForTests();
});

describe("isBackendUnavailableError", () => {
  it("detects API errors with no backend response", () => {
    const error = new Error("Request failed");
    error.name = "ApiError";

    expect(isBackendUnavailableError(error)).toBe(true);
  });

  it("detects raw fetch failures", () => {
    expect(isBackendUnavailableError(new TypeError("Failed to fetch"))).toBe(
      true,
    );
  });

  it.each([
    ["bad gateway", Status.BAD_GATEWAY],
    ["service unavailable", Status.SERVICE_UNAVAILABLE],
    ["gateway timeout", Status.GATEWAY_TIMEOUT],
  ])("detects a proxy %s response", (_label, status) => {
    expect(isBackendUnavailableError(createApiErrorWithStatus(status))).toBe(
      true,
    );
  });

  it("does not treat server responses as backend availability failures", () => {
    // The backend answered, so it is up; the failure belongs to this request.
    expect(
      isBackendUnavailableError(
        createApiErrorWithStatus(Status.INTERNAL_SERVER),
      ),
    ).toBe(false);
  });

  it("does not treat client errors as backend availability failures", () => {
    expect(
      isBackendUnavailableError(createApiErrorWithStatus(Status.UNAUTHORIZED)),
    ).toBe(false);
  });

  it("ignores non-API errors", () => {
    expect(isBackendUnavailableError(new Error("Something else broke"))).toBe(
      false,
    );
    expect(isBackendUnavailableError("not an error")).toBe(false);
  });
});

describe("backend availability", () => {
  it("tracks when the backend is unavailable", () => {
    markBackendUnavailable();

    expect(isBackendUnavailable()).toBe(true);
  });

  it("clears unavailable state when the backend responds", () => {
    markBackendUnavailable();

    markBackendAvailable();

    expect(isBackendUnavailable()).toBe(false);
  });
});
