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
