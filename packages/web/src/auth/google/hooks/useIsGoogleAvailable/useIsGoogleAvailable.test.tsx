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

const createDelegationHook = () => {
  const { resetGoogleAvailabilityForTests, useIsConnectDelegatedToSync } =
    createGoogleAvailability({
      getConfig,
      isGoogleAuthConfigured: true,
    });

  resetGoogleAvailabilityForTests();

  return useIsConnectDelegatedToSync;
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
  it("is available under sync delegation even with no baked GOOGLE_CLIENT_ID (self-host, unrebuilt web image)", async () => {
    getConfig.mockClear();
    getConfig.mockResolvedValue({
      google: { isConfigured: true, connectDelegatedToSync: true },
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

  it("stays unavailable on the legacy popup flow with no baked GOOGLE_CLIENT_ID", async () => {
    getConfig.mockClear();
    getConfig.mockResolvedValue({
      google: { isConfigured: true, connectDelegatedToSync: false },
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

  it("stays unavailable when the backend has no Google configured at all, even under sync delegation", async () => {
    getConfig.mockClear();
    getConfig.mockResolvedValue({
      google: { isConfigured: false, connectDelegatedToSync: true },
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
  it("stays unavailable without a baked GOOGLE_CLIENT_ID even when the backend is sync-delegated and configured", async () => {
    getConfig.mockClear();
    getConfig.mockResolvedValue({
      google: { isConfigured: true, connectDelegatedToSync: true },
    });
    const { resetGoogleAvailabilityForTests, useIsGoogleAvailable } =
      createGoogleAvailability({ getConfig, isGoogleAuthConfigured: false });
    resetGoogleAvailabilityForTests();

    const { result } = renderHook(() => useIsGoogleAvailable());

    await waitFor(() => {
      expect(getConfig).toHaveBeenCalledTimes(1);
    });
    // Sign-in is unaffected by connect delegation — the redirect flow only
    // relaxes the connect surface, never sign-in.
    expect(result.current).toBe(false);
  });
});

describe("useIsConnectDelegatedToSync", () => {
  it("reflects the backend connect-delegation flag from config", async () => {
    getConfig.mockClear();
    getConfig.mockResolvedValue({
      google: {
        isConfigured: true,
        connectDelegatedToSync: true,
      },
    });
    const useIsConnectDelegatedToSync = createDelegationHook();

    const { result } = renderHook(() => useIsConnectDelegatedToSync());

    // Defaults to legacy (false) until the config load resolves.
    expect(result.current).toBe(false);

    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });

  it("stays on legacy when the flag is absent from an older backend", async () => {
    getConfig.mockClear();
    getConfig.mockResolvedValue({
      google: {
        isConfigured: true,
      },
    });
    const useIsConnectDelegatedToSync = createDelegationHook();

    const { result } = renderHook(() => useIsConnectDelegatedToSync());

    await waitFor(() => {
      expect(getConfig).toHaveBeenCalledTimes(1);
    });
    expect(result.current).toBe(false);
  });
});
