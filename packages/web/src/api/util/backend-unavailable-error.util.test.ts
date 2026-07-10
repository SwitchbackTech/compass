import {
  isBackendUnavailable,
  isBackendUnavailableError,
  markBackendAvailable,
  markBackendUnavailable,
  resetBackendAvailabilityForTests,
} from "./backend-unavailable-error.util";

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

  it("does not treat server responses as backend availability failures", () => {
    const error = new Error("Request failed with status 500");
    error.name = "ApiError";

    expect(isBackendUnavailableError(error)).toBe(false);
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
