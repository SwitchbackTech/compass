import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, mock } from "bun:test";

const getConfig = mock();

mock.module("@web/common/apis/app-config.api", () => ({
  AppConfigApi: {
    get: getConfig,
  },
}));

mock.module("@web/common/constants/env.constants", () => ({
  IS_GOOGLE_AUTH_CONFIGURED: true,
}));

async function importHook() {
  const moduleUrl = new URL(
    `./useIsGoogleAvailable.ts?test=${Math.random().toString(36).slice(2)}`,
    import.meta.url,
  );

  return import(moduleUrl.href);
}

describe("useIsGoogleAvailable", () => {
  it("uses the backend config response before exposing Google UI", async () => {
    getConfig.mockClear();
    getConfig.mockResolvedValue({
      google: {
        isConfigured: true,
      },
    });
    const { resetGoogleAvailabilityForTests, useIsGoogleAvailable } =
      await importHook();
    resetGoogleAvailabilityForTests();

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
    const { resetGoogleAvailabilityForTests, useIsGoogleAvailable } =
      await importHook();
    resetGoogleAvailabilityForTests();

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
