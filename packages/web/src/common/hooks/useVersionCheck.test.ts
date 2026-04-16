import { renderHook, waitFor } from "@testing-library/react";
import { act } from "react";

let mockIsDev = false;

const MIN_HIDDEN_DURATION_MS = 30_000;
const BACKUP_CHECK_INTERVAL_MS = 5 * 60 * 1000;

async function renderVersionCheckHook() {
  jest.mock("@web/common/constants/env.constants", () => ({
    IS_DEV: mockIsDev,
  }));

  const moduleUrl = new URL(
    `./useVersionCheck.ts?test=${Math.random().toString(36).slice(2)}`,
    import.meta.url,
  );
  const { useVersionCheck } = await import(moduleUrl.href);

  return renderHook(() => useVersionCheck());
}

describe("useVersionCheck", () => {
  let visibilityState = "visible";

  /** Lets checkVersion's fetch → json → setState chain finish inside act (microtasks). */
  const flushVersionCheckAsync = async () => {
    await act(async () => {
      for (let i = 0; i < 20; i++) {
        await Promise.resolve();
      }
    });
  };

  beforeEach(() => {
    mockIsDev = false;
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-02-05T00:00:00.000Z"));

    visibilityState = "visible";
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => visibilityState,
    });

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ version: "dev" }),
    }) as typeof fetch;
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it("checks version on initial mount", async () => {
    await renderVersionCheckHook();
    await flushVersionCheckAsync();

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/^http:\/\/localhost\/version\.json\?t=\d+$/),
      expect.objectContaining({
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      }),
    );
  });

  it("does not check for updates in development mode", async () => {
    mockIsDev = true;
    const addEventListenerSpy = jest.spyOn(document, "addEventListener");
    const setIntervalSpy = jest.spyOn(window, "setInterval");

    await renderVersionCheckHook();
    await flushVersionCheckAsync();

    expect(global.fetch).not.toHaveBeenCalled();
    expect(addEventListenerSpy).not.toHaveBeenCalled();
    expect(setIntervalSpy).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(BACKUP_CHECK_INTERVAL_MS);
    });

    expect(global.fetch).not.toHaveBeenCalled();

    addEventListenerSpy.mockRestore();
    setIntervalSpy.mockRestore();
  });

  it("sets isUpdateAvailable when server version differs", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ version: "1.0.0" }),
    }) as typeof fetch;

    const { result } = await renderVersionCheckHook();

    await flushVersionCheckAsync();

    await waitFor(() => {
      expect(result.current.isUpdateAvailable).toBe(true);
    });
  });

  it("keeps isUpdateAvailable false when versions match", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ version: "dev" }),
    }) as typeof fetch;

    const { result } = await renderVersionCheckHook();

    await flushVersionCheckAsync();

    expect(result.current.isUpdateAvailable).toBe(false);
  });

  it("handles network failures without crashing", async () => {
    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    global.fetch = jest
      .fn()
      .mockRejectedValue(new Error("Network down")) as typeof fetch;

    const { result } = await renderVersionCheckHook();

    await flushVersionCheckAsync();

    expect(result.current.isUpdateAvailable).toBe(false);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Version check failed:",
      expect.any(Error),
    );

    consoleErrorSpy.mockRestore();
  });

  it("ignores invalid version payloads", async () => {
    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ version: 123 }),
    }) as typeof fetch;

    const { result } = await renderVersionCheckHook();

    await flushVersionCheckAsync();

    expect(result.current.isUpdateAvailable).toBe(false);
    expect(consoleErrorSpy).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it("checks when tab becomes visible after being hidden long enough", async () => {
    await renderVersionCheckHook();
    await flushVersionCheckAsync();

    (global.fetch as jest.Mock).mockClear();

    act(() => {
      visibilityState = "hidden";
      document.dispatchEvent(new Event("visibilitychange"));
      jest.advanceTimersByTime(MIN_HIDDEN_DURATION_MS + 1_000);
      visibilityState = "visible";
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("does not check when tab becomes visible after a short hide", async () => {
    await renderVersionCheckHook();
    await flushVersionCheckAsync();

    (global.fetch as jest.Mock).mockClear();

    act(() => {
      visibilityState = "hidden";
      document.dispatchEvent(new Event("visibilitychange"));
      jest.advanceTimersByTime(MIN_HIDDEN_DURATION_MS - 10_000);
      visibilityState = "visible";
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("cleans up the visibility listener on unmount", async () => {
    const addEventListenerSpy = jest.spyOn(document, "addEventListener");
    const removeEventListenerSpy = jest.spyOn(document, "removeEventListener");

    const { unmount } = await renderVersionCheckHook();

    const handler = addEventListenerSpy.mock.calls.find(
      ([eventName]) => eventName === "visibilitychange",
    )?.[1];

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "visibilitychange",
      handler,
    );

    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });

  it("runs the backup poll on the interval", async () => {
    await renderVersionCheckHook();
    await flushVersionCheckAsync();

    (global.fetch as jest.Mock).mockClear();

    act(() => {
      jest.advanceTimersByTime(BACKUP_CHECK_INTERVAL_MS);
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("prevents concurrent checks", async () => {
    let resolveFetch: ((value: unknown) => void) | undefined;
    const fetchPromise = new Promise((resolve) => {
      resolveFetch = resolve;
    });

    await renderVersionCheckHook();
    await flushVersionCheckAsync();

    global.fetch = jest.fn().mockReturnValue(fetchPromise) as typeof fetch;
    (global.fetch as jest.Mock).mockClear();

    act(() => {
      visibilityState = "hidden";
      document.dispatchEvent(new Event("visibilitychange"));
      jest.advanceTimersByTime(MIN_HIDDEN_DURATION_MS + 1_000);
      visibilityState = "visible";
      document.dispatchEvent(new Event("visibilitychange"));

      visibilityState = "hidden";
      document.dispatchEvent(new Event("visibilitychange"));
      jest.advanceTimersByTime(MIN_HIDDEN_DURATION_MS + 1_000);
      visibilityState = "visible";
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);

    act(() => {
      resolveFetch?.({
        ok: true,
        json: async () => ({ version: "dev" }),
      });
    });
  });
});
