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
const createApiErrorWithStatus = (status: number, data?: unknown): ApiError => {
  const error = new Error(`Request failed with status ${status}`) as ApiError;
  error.name = "ApiError";
  error.response = { status, data } as ApiResponse<unknown>;
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
    expect(
      isBackendUnavailableError(
        new TypeError("NetworkError when attempting to fetch resource."),
      ),
    ).toBe(true);
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

  // The backend answers PROVIDER_FAILURE with a 502 of its own, e.g. when
  // Google rejects a sync. Treating that as "backend down" dropped the app
  // into local mode mid-mutation, which either threw "Event not found" from
  // IndexedDB or silently re-keyed the queries and lost the edit from view.
  it("does not treat a backend-authored gateway error as unavailability", () => {
    expect(
      isBackendUnavailableError(
        createApiErrorWithStatus(Status.BAD_GATEWAY, {
          code: "PROVIDER_FAILURE",
          message: "Failed to sync the change to Google Calendar",
          retryable: true,
        }),
      ),
    ).toBe(false);
  });

  it("does not treat a maintenance 503 as backend unavailability", () => {
    // Cutover maintenance answers with 503 + EventMutationError. The API is
    // up; flipping into local mode would hide the pause and rewrite IndexedDB.
    expect(
      isBackendUnavailableError(
        createApiErrorWithStatus(Status.SERVICE_UNAVAILABLE, {
          code: "MAINTENANCE",
          message: "Cloud edits are paused for maintenance",
          retryable: true,
        }),
      ),
    ).toBe(false);
  });

  it("still treats a gateway error with no backend body as unavailability", () => {
    expect(
      isBackendUnavailableError(
        createApiErrorWithStatus(Status.BAD_GATEWAY, "<html>502 Bad Gateway"),
      ),
    ).toBe(true);
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
