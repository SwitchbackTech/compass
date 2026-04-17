import { act } from "react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from "bun:test";

mock.restore();

mock.module("@web/components/OverlayPanel/OverlayPanel", () => ({
  OverlayPanel: ({
    title,
    message,
  }: {
    message: string;
    title: string;
  }) => (
    <div role="status">
      <h1>{title}</h1>
      <p>{message}</p>
    </div>
  ),
}));

mock.module("@web/common/hooks/useBufferedVisibility", () => ({
  useBufferedVisibility: (value: boolean) => value,
}));

let authStatus: "idle" | "authenticating" = "idle";

mock.module("@web/store/store.hooks", () => ({
  useAppSelector: (selector: (state: { auth: { status: string } }) => unknown) =>
    selector({ auth: { status: authStatus } }),
}));

const { SyncEventsOverlay } =
  require("./SyncEventsOverlay") as typeof import("./SyncEventsOverlay");

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

  it("renders nothing when not authenticating", () => {
    authStatus = "idle";
    render(<SyncEventsOverlay />);

    expect(screen.queryByText("Complete Google sign-in...")).toBeNull();
    expect(document.body.getAttribute("data-app-locked")).toBeNull();
  });

  it("renders OAuth message when authenticating", () => {
    authStatus = "authenticating";
    render(<SyncEventsOverlay />);

    expect(screen.getByText("Complete Google sign-in...")).toBeInTheDocument();
    expect(
      screen.getByText("Please complete authorization in the popup window"),
    ).toBeInTheDocument();
    expect(document.body.getAttribute("data-app-locked")).toBe("true");
  });

  it("unlocks app when authentication completes", () => {
    authStatus = "authenticating";
    const { rerender } = render(<SyncEventsOverlay />);

    expect(screen.getByText("Complete Google sign-in...")).toBeInTheDocument();
    expect(document.body.getAttribute("data-app-locked")).toBe("true");

    act(() => {
      authStatus = "idle";
      rerender(<SyncEventsOverlay />);
    });

    // Wait for buffered visibility to settle
    act(() => {
      runPendingTimers();
    });

    expect(screen.queryByText("Complete Google sign-in...")).toBeNull();
    expect(document.body.getAttribute("data-app-locked")).toBeNull();
  });
});
