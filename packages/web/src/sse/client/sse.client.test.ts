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
} from "bun:test";

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
  let fakeEs: FakeEventSource;
  let timerCallbacks: Array<{ callback: () => void; delayMs: number }>;
  let setTimeoutSpy: ReturnType<typeof mock>;

  afterAll(() => {
    globalThis.EventSource = originalEventSource;
    globalThis.setTimeout = originalSetTimeout;
  });

  beforeEach(() => {
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
  });

  afterEach(() => {
    closeStream();
  });

  const runDegradedTimer = () => {
    const due = timerCallbacks.find((t) => t.delayMs === 15_000);
    due?.callback();
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
});
