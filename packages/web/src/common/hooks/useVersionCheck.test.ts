import { act } from "react";
import { renderHook } from "@testing-library/react";
import { useVersionCheck } from "@web/common/hooks/useVersionCheck";

let mockIsDev = false;
jest.mock("@web/common/constants/env.constants", () => ({
  get IS_DEV() {
    return mockIsDev;
  },
}));

const MIN_HIDDEN_DURATION_MS = 30_000;
const BACKUP_CHECK_INTERVAL_MS = 5 * 60 * 1000;

describe("useVersionCheck", () => {
  let visibilityState = "visible";
  const flushPromises = async () => {
    await Promise.resolve();
    await Promise.resolve();
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
    renderHook(() => useVersionCheck());
    await act(async () => {
      await flushPromises();
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/^\/version\.json\?t=\d+$/),
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

    renderHook(() => useVersionCheck());
    await act(async () => {
      await flushPromises();
    });

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

    const { result } = renderHook(() => useVersionCheck());

    await act(async () => {
      await flushPromises();
    });

    expect(result.current.isUpdateAvailable).toBe(true);
  });

  it("keeps isUpdateAvailable false when versions match", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ version: "dev" }),
    }) as typeof fetch;

    const { result } = renderHook(() => useVersionCheck());

    await act(async () => {
      await flushPromises();
    });

    expect(result.current.isUpdateAvailable).toBe(false);
  });

  it("handles network failures without crashing", async () => {
    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    global.fetch = jest
      .fn()
      .mockRejectedValue(new Error("Network down")) as typeof fetch;

    const { result } = renderHook(() => useVersionCheck());

    await act(async () => {
      await flushPromises();
    });

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

    const { result } = renderHook(() => useVersionCheck());

    await act(async () => {
      await flushPromises();
    });

    expect(result.current.isUpdateAvailable).toBe(false);
    expect(consoleErrorSpy).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it("checks when tab becomes visible after being hidden long enough", async () => {
    renderHook(() => useVersionCheck());
    await act(async () => {
      await flushPromises();
    });
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
    renderHook(() => useVersionCheck());
    await act(async () => {
      await flushPromises();
    });
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

  it("cleans up the visibility listener on unmount", () => {
    const addEventListenerSpy = jest.spyOn(document, "addEventListener");
    const removeEventListenerSpy = jest.spyOn(document, "removeEventListener");

    const { unmount } = renderHook(() => useVersionCheck());

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
    renderHook(() => useVersionCheck());
    await act(async () => {
      await flushPromises();
    });
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

    renderHook(() => useVersionCheck());
    await act(async () => {
      await flushPromises();
    });

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
