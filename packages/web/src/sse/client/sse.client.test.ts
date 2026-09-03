import * as posthogBootstrap from "@web/auth/posthog/posthog.bootstrap";
import {
  closeStream,
  isSseDegraded,
  openStream,
  subscribeSseDegraded,
} from "./sse.client";
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  spyOn,
} from "bun:test";

const capture = mock();
const getPosthogClient = spyOn(
  posthogBootstrap,
  "getPosthogClient",
).mockReturnValue({ capture } as never);

afterAll(() => {
  getPosthogClient.mockRestore();
});

// Minimal EventSource fake: no network, just enough surface for sse.client's
// addEventListener/removeEventListener/close and readyState check.
class FakeEventSource {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 2;

  readyState = FakeEventSource.CONNECTING;
  #listeners = new Map<string, Set<(event: unknown) => void>>();

  addEventListener(type: string, listener: (event: unknown) => void): void {
    let set = this.#listeners.get(type);
    if (!set) {
      set = new Set();
      this.#listeners.set(type, set);
    }
    set.add(listener);
  }

  removeEventListener(type: string, listener: (event: unknown) => void): void {
    this.#listeners.get(type)?.delete(listener);
  }

  close(): void {
    this.readyState = FakeEventSource.CLOSED;
  }

  dispatch(type: string, event: unknown = {}): void {
    for (const listener of this.#listeners.get(type) ?? []) {
      listener(event);
    }
  }
}

describe("sse.client degraded state", () => {
  const originalEventSource = globalThis.EventSource;
  const originalSetTimeout = globalThis.setTimeout;
  const originalDateNow = Date.now;
  let fakeEs: FakeEventSource;
  let timerCallbacks: Array<{ callback: () => void; delayMs: number }>;
  let setTimeoutSpy: ReturnType<typeof mock>;
  let nowMs: number;

  afterAll(() => {
    globalThis.EventSource = originalEventSource;
    globalThis.setTimeout = originalSetTimeout;
    Date.now = originalDateNow;
  });

  beforeEach(() => {
    capture.mockClear();
    getPosthogClient.mockReturnValue({ capture } as never);
    fakeEs = new FakeEventSource();
    // @ts-expect-error test double, not a full EventSource
    globalThis.EventSource = Object.assign(
      mock(() => fakeEs),
      {
        CONNECTING: FakeEventSource.CONNECTING,
        OPEN: FakeEventSource.OPEN,
        CLOSED: FakeEventSource.CLOSED,
      },
    );

    timerCallbacks = [];
    setTimeoutSpy = mock((callback: () => void, delayMs: number) => {
      timerCallbacks.push({ callback, delayMs });
      return timerCallbacks.length;
    });
    // @ts-expect-error partial override, only setTimeout is invoked by name here
    globalThis.setTimeout = setTimeoutSpy;

    nowMs = 1_000_000;
    Date.now = () => nowMs;
    window.history.replaceState(null, "", "/");
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: true,
    });
  });

  afterEach(() => {
    closeStream();
    Date.now = originalDateNow;
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: true,
    });
    window.history.replaceState(null, "", "/");
  });

  const runDegradedTimer = () => {
    const due = timerCallbacks.find((t) => t.delayMs === 15_000);
    due?.callback();
  };

  const openThenError = (readyState = FakeEventSource.CONNECTING) => {
    openStream();
    fakeEs.readyState = FakeEventSource.OPEN;
    fakeEs.dispatch("open");
    fakeEs.readyState = readyState;
    fakeEs.dispatch("error");
  };

  it("starts not degraded", () => {
    expect(isSseDegraded()).toBe(false);
  });

  it("flips degraded once the stream has been down past the 15s window", () => {
    openStream();
    fakeEs.dispatch("error");

    expect(isSseDegraded()).toBe(false);

    runDegradedTimer();

    expect(isSseDegraded()).toBe(true);
  });

  it("does not report degraded if the stream reopens before the window elapses", () => {
    openStream();
    fakeEs.dispatch("error");
    fakeEs.readyState = FakeEventSource.OPEN;
    fakeEs.dispatch("open");

    runDegradedTimer();

    expect(isSseDegraded()).toBe(false);
    expect(capture).not.toHaveBeenCalled();
  });

  it("notifies subscribers when degraded flips", () => {
    const onChange = mock();
    const unsubscribe = subscribeSseDegraded(onChange);

    openStream();
    fakeEs.dispatch("error");
    runDegradedTimer();

    expect(onChange).toHaveBeenCalled();
    unsubscribe();
  });

  it("clears degraded on reconnect (open event)", () => {
    openStream();
    fakeEs.dispatch("error");
    runDegradedTimer();
    expect(isSseDegraded()).toBe(true);

    fakeEs.readyState = FakeEventSource.OPEN;
    fakeEs.dispatch("open");

    expect(isSseDegraded()).toBe(false);
  });

  it("clears degraded when the stream is intentionally closed", () => {
    openStream();
    fakeEs.dispatch("error");
    runDegradedTimer();
    expect(isSseDegraded()).toBe(true);

    closeStream();

    expect(isSseDegraded()).toBe(false);
  });

  it("captures diagnostic properties on the first degraded report", () => {
    window.history.replaceState(null, "", "/week");
    openStream();
    fakeEs.readyState = FakeEventSource.OPEN;
    fakeEs.dispatch("open");
    fakeEs.dispatch("message", {
      data: JSON.stringify({
        type: "eventsChanged",
        calendarId: "507f1f77bcf86cd799439011",
        eventIds: ["507f1f77bcf86cd799439012"],
        reason: "updated",
      }),
    });
    fakeEs.dispatch("message", {
      data: JSON.stringify({
        type: "calendarsChanged",
        calendarIds: ["507f1f77bcf86cd799439011"],
      }),
    });
    nowMs += 4_000;
    fakeEs.readyState = FakeEventSource.CONNECTING;
    fakeEs.dispatch("error");
    runDegradedTimer();

    expect(capture).toHaveBeenCalledTimes(1);
    expect(capture).toHaveBeenCalledWith("sse_connection_degraded", {
      reconnect_count: 1,
      error_type: "timeout",
      connection_duration_ms: 4_000,
      retry_attempt: 0,
      user_event_count: 2,
      page_path: "/week",
    });
  });

  it("records connection_duration_ms from last open to the first error", () => {
    openStream();
    fakeEs.readyState = FakeEventSource.OPEN;
    fakeEs.dispatch("open");
    nowMs += 12_500;
    fakeEs.readyState = FakeEventSource.CONNECTING;
    fakeEs.dispatch("error");
    runDegradedTimer();

    expect(capture).toHaveBeenCalledWith(
      "sse_connection_degraded",
      expect.objectContaining({ connection_duration_ms: 12_500 }),
    );
  });

  it("counts retry_attempt from zero for the first failure in an episode", () => {
    openThenError();
    fakeEs.dispatch("error");
    fakeEs.dispatch("error");
    runDegradedTimer();

    expect(capture).toHaveBeenCalledWith(
      "sse_connection_degraded",
      expect.objectContaining({
        retry_attempt: 2,
        reconnect_count: 3,
      }),
    );
  });

  it("classifies a closed EventSource as server_closed", () => {
    openThenError(FakeEventSource.CLOSED);
    runDegradedTimer();

    expect(capture).toHaveBeenCalledWith(
      "sse_connection_degraded",
      expect.objectContaining({ error_type: "server_closed" }),
    );
  });

  it("classifies an offline browser as network_error", () => {
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: false,
    });
    openThenError();
    runDegradedTimer();

    expect(capture).toHaveBeenCalledWith(
      "sse_connection_degraded",
      expect.objectContaining({ error_type: "network_error" }),
    );
  });

  it("does not let a PostHog failure interrupt degraded-state reporting", () => {
    capture.mockImplementationOnce(() => {
      throw new Error("capture unavailable");
    });
    openThenError();

    expect(() => runDegradedTimer()).not.toThrow();
    expect(isSseDegraded()).toBe(true);
  });
});
