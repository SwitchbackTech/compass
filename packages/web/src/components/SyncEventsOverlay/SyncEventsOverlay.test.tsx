import { act } from "react";
import "@testing-library/jest-dom";
import { configureStore } from "@reduxjs/toolkit";
import { screen } from "@testing-library/react";
import { render } from "@web/__tests__/__mocks__/mock.render";
import { createInitialState } from "@web/__tests__/utils/state/store.test.util";
import { type AuthStatus, resetAuth } from "@web/ducks/auth/slices/auth.slice";
import { reducers } from "@web/store/reducers";
import { SyncEventsOverlay } from "./SyncEventsOverlay";
import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";

describe("SyncEventsOverlay", () => {
  let pendingTimers: Array<() => void> = [];
  let setTimeoutSpy: ReturnType<typeof spyOn>;
  let clearTimeoutSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    pendingTimers = [];
    setTimeoutSpy = spyOn(globalThis, "setTimeout").mockImplementation(((
      callback: TimerHandler,
    ) => {
      if (typeof callback === "function") {
        pendingTimers.push(() => callback());
      }
      return 1 as ReturnType<typeof setTimeout>;
    }) as typeof setTimeout);
    clearTimeoutSpy = spyOn(globalThis, "clearTimeout").mockImplementation(
      (() => undefined) as typeof clearTimeout,
    );
    document.body.removeAttribute("data-app-locked");
  });

  afterEach(() => {
    setTimeoutSpy.mockRestore();
    clearTimeoutSpy.mockRestore();
  });

  const runPendingTimers = () => {
    const timers = pendingTimers;
    pendingTimers = [];

    for (const timer of timers) {
      timer();
    }
  };

  const createStore = (status: AuthStatus = "idle") =>
    configureStore({
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
          immutableCheck: false,
          serializableCheck: false,
          thunk: false,
        }),
      preloadedState: createInitialState({
        auth: {
          error: null,
          status,
        },
      }),
      reducer: reducers,
    });

  it("renders nothing when not authenticating", () => {
    render(<SyncEventsOverlay />, {
      store: createStore(),
    });

    expect(screen.queryByText("Complete Google sign-in...")).toBeNull();
    expect(document.body.getAttribute("data-app-locked")).toBeNull();
  });

  it("renders OAuth message when authenticating", () => {
    render(<SyncEventsOverlay />, {
      store: createStore("authenticating"),
    });

    expect(screen.getByText("Complete Google sign-in...")).toBeInTheDocument();
    expect(
      screen.getByText("Please complete authorization in the popup window"),
    ).toBeInTheDocument();
    expect(document.body.getAttribute("data-app-locked")).toBe("true");
  });

  it("unlocks app when authentication completes", () => {
    const store = createStore("authenticating");

    render(<SyncEventsOverlay />, { store });

    expect(screen.getByText("Complete Google sign-in...")).toBeInTheDocument();
    expect(document.body.getAttribute("data-app-locked")).toBe("true");

    act(() => {
      store.dispatch(resetAuth());
    });

    // Wait for buffered visibility to settle
    act(() => {
      runPendingTimers();
    });

    expect(screen.queryByText("Complete Google sign-in...")).toBeNull();
    expect(document.body.getAttribute("data-app-locked")).toBeNull();
  });
});
