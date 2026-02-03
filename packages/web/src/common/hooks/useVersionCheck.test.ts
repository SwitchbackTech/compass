import { renderHook, waitFor } from "@testing-library/react";
import { useVersionCheck } from "./useVersionCheck";

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

describe("useVersionCheck", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should return isUpdateAvailable as false initially", () => {
    const { result } = renderHook(() => useVersionCheck());

    expect(result.current.isUpdateAvailable).toBe(false);
    expect(result.current.currentVersion).toBeDefined();
  });

  it("should skip version check in development mode", () => {
    const { result } = renderHook(() => useVersionCheck());

    // In dev mode, fetch should not be called
    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.current.isUpdateAvailable).toBe(false);
  });

  it("should handle fetch errors gracefully", async () => {
    // Temporarily override BUILD_VERSION to simulate production
    const originalBuildVersion = (global as any).BUILD_VERSION;
    (global as any).BUILD_VERSION = "1.0.0";

    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useVersionCheck());

    await waitFor(() => {
      expect(result.current.isUpdateAvailable).toBe(false);
    });

    // Restore original value
    (global as any).BUILD_VERSION = originalBuildVersion;
  });

  it("should return current version", () => {
    const { result } = renderHook(() => useVersionCheck());

    expect(result.current.currentVersion).toBe("dev");
  });
});
