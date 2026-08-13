import { renderHook } from "@testing-library/react";
import { act } from "react";
import { userMetadataActions } from "@web/auth/state/user-metadata.store";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  spyOn,
} from "bun:test";

const mockRefreshUserMetadata = mock().mockResolvedValue(undefined);

mock.module("@web/auth/compass/user/util/user-metadata.util", () => ({
  refreshUserMetadata: mockRefreshUserMetadata,
}));

const { useTransientSyncPolling } =
  require("./useTransientSyncPolling") as typeof import("./useTransientSyncPolling");

const TRANSIENT_POLL_MS = 20_000;

describe("useTransientSyncPolling", () => {
  let intervalCallback: (() => void) | undefined;
  let setIntervalSpy: ReturnType<typeof spyOn>;
  let clearIntervalSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    intervalCallback = undefined;
    mockRefreshUserMetadata.mockClear();
    setIntervalSpy = spyOn(window, "setInterval").mockImplementation(((
      callback: TimerHandler,
    ) => {
      if (typeof callback === "function") {
        intervalCallback = () => callback();
      }
      return 1;
    }) as typeof window.setInterval);
    clearIntervalSpy = spyOn(globalThis, "clearInterval").mockImplementation(
      () => {},
    );
  });

  afterEach(() => {
    setIntervalSpy.mockRestore();
    clearIntervalSpy.mockRestore();
    userMetadataActions.clear();
  });

  it("polls metadata while a connection is importing and stops when it settles", () => {
    userMetadataActions.set({
      google: {
        connectionState: "IMPORTING",
        connections: [
          {
            id: "c1",
            state: "importing",
            stateReason: null,
            lastSyncedAt: null,
            lastHealthyAt: null,
            accountEmail: "a@example.com",
            connectionState: "IMPORTING",
          },
        ],
      },
    });

    const hook = renderHook(() => useTransientSyncPolling());

    expect(setIntervalSpy).toHaveBeenCalledWith(
      expect.any(Function),
      TRANSIENT_POLL_MS,
    );

    act(() => {
      intervalCallback?.();
    });
    expect(mockRefreshUserMetadata).toHaveBeenCalledWith({ force: true });

    act(() => {
      userMetadataActions.set({
        google: {
          connectionState: "HEALTHY",
          connections: [
            {
              id: "c1",
              state: "healthy",
              stateReason: null,
              lastSyncedAt: null,
              lastHealthyAt: null,
              accountEmail: "a@example.com",
              connectionState: "HEALTHY",
            },
          ],
        },
      });
    });
    hook.rerender();

    expect(clearIntervalSpy).toHaveBeenCalled();
  });

  it("does not poll when no connection is transient", () => {
    userMetadataActions.set({
      google: {
        connectionState: "HEALTHY",
        connections: [
          {
            id: "c1",
            state: "healthy",
            stateReason: null,
            lastSyncedAt: null,
            lastHealthyAt: null,
            accountEmail: "a@example.com",
            connectionState: "HEALTHY",
          },
        ],
      },
    });

    renderHook(() => useTransientSyncPolling());

    expect(setIntervalSpy).not.toHaveBeenCalled();
  });
});
