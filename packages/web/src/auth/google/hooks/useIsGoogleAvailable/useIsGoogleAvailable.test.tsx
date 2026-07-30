import { renderHook, waitFor } from "@testing-library/react";
import { createGoogleAvailability } from "./useIsGoogleAvailable.factory";
import { describe, expect, it, mock } from "bun:test";

const getConfig = mock();

const createHook = () => {
  const { resetGoogleAvailabilityForTests, useIsGoogleAvailable } =
    createGoogleAvailability({
      getConfig,
      isGoogleAuthConfigured: true,
    });

  resetGoogleAvailabilityForTests();

  return useIsGoogleAvailable;
};

describe("useIsGoogleAvailable", () => {
  it("uses the backend config response before exposing Google UI", async () => {
    getConfig.mockClear();
    getConfig.mockResolvedValue({
      google: {
        isConfigured: true,
      },
    });
    const useIsGoogleAvailable = createHook();

    const { result } = renderHook(() => useIsGoogleAvailable());

    expect(result.current).toBe(false);

    await waitFor(() => {
      expect(result.current).toBe(true);
    });
    expect(getConfig).toHaveBeenCalledTimes(1);
  });

  it("retries backend config after a failed request on the next mount", async () => {
    getConfig.mockClear();
    getConfig
      .mockRejectedValueOnce(new Error("temporary config failure"))
      .mockResolvedValueOnce({
        google: {
          isConfigured: true,
        },
      });
    const useIsGoogleAvailable = createHook();

    const firstRender = renderHook(() => useIsGoogleAvailable());

    await waitFor(() => {
      expect(getConfig).toHaveBeenCalledTimes(1);
    });
    expect(firstRender.result.current).toBe(false);
    firstRender.unmount();

    const secondRender = renderHook(() => useIsGoogleAvailable());

    await waitFor(() => {
      expect(secondRender.result.current).toBe(true);
    });
    expect(getConfig).toHaveBeenCalledTimes(2);
  });
});

describe("useIsConnectGoogleAvailable", () => {
  it("is available with no baked GOOGLE_CLIENT_ID (self-host, unrebuilt web image)", async () => {
    getConfig.mockClear();
    getConfig.mockResolvedValue({
      google: { isConfigured: true },
    });
    const { resetGoogleAvailabilityForTests, useIsConnectGoogleAvailable } =
      createGoogleAvailability({ getConfig, isGoogleAuthConfigured: false });
    resetGoogleAvailabilityForTests();

    const { result } = renderHook(() => useIsConnectGoogleAvailable());

    expect(result.current).toBe(false);
    await waitFor(() => {
      expect(result.current).toBe(true);
    });
    // The old behavior bailed out before ever calling getConfig() when no
    // client id was baked in — this is the regression this test guards.
    expect(getConfig).toHaveBeenCalledTimes(1);
  });

  it("stays unavailable when the backend has no Google configured at all", async () => {
    getConfig.mockClear();
    getConfig.mockResolvedValue({
      google: { isConfigured: false },
    });
    const { resetGoogleAvailabilityForTests, useIsConnectGoogleAvailable } =
      createGoogleAvailability({ getConfig, isGoogleAuthConfigured: false });
    resetGoogleAvailabilityForTests();

    const { result } = renderHook(() => useIsConnectGoogleAvailable());

    await waitFor(() => {
      expect(getConfig).toHaveBeenCalledTimes(1);
    });
    expect(result.current).toBe(false);
  });
});

describe("useIsGoogleAvailable (sign-in) stays gated on the baked client id", () => {
  it("stays unavailable without a baked GOOGLE_CLIENT_ID even when the backend is configured", async () => {
    getConfig.mockClear();
    getConfig.mockResolvedValue({
      google: { isConfigured: true },
    });
    const { resetGoogleAvailabilityForTests, useIsGoogleAvailable } =
      createGoogleAvailability({ getConfig, isGoogleAuthConfigured: false });
    resetGoogleAvailabilityForTests();

    const { result } = renderHook(() => useIsGoogleAvailable());

    await waitFor(() => {
      expect(getConfig).toHaveBeenCalledTimes(1);
    });
    // Sign-in always needs the baked client id — only connect relaxes this.
    expect(result.current).toBe(false);
  });
});
