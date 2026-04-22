import { act } from "react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
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
import { readFile, writeFile } from "node:fs/promises";

mock.restore();

const componentQuery = "?test=sync-events-overlay";
const overlayPanelQuery = `@web/components/OverlayPanel/OverlayPanel${componentQuery}`;
const bufferedVisibilityQuery = `@web/common/hooks/useBufferedVisibility${componentQuery}`;
const storeHooksQuery = `@web/store/store.hooks${componentQuery}`;

mock.module(overlayPanelQuery, () => ({
  OverlayPanel: ({ title, message }: { message: string; title: string }) => (
    <div role="status">
      <h1>{title}</h1>
      <p>{message}</p>
    </div>
  ),
}));

mock.module(bufferedVisibilityQuery, () => ({
  useBufferedVisibility: (value: boolean) => value,
}));

let authStatus: "idle" | "authenticating" = "idle";

mock.module(storeHooksQuery, () => ({
  useAppSelector: (
    selector: (state: { auth: { status: string } }) => unknown,
  ) => selector({ auth: { status: authStatus } }),
}));

const source = await readFile(
  new URL("./SyncEventsOverlay.tsx", import.meta.url),
  "utf8",
);

const transformedSource = source
  .replaceAll("@web/components/OverlayPanel/OverlayPanel", overlayPanelQuery)
  .replaceAll(
    "@web/common/hooks/useBufferedVisibility",
    bufferedVisibilityQuery,
  )
  .replaceAll("@web/store/store.hooks", storeHooksQuery);

const transpiler = new Bun.Transpiler({
  autoImportJSX: true,
  tsconfig: {
    compilerOptions: {
      jsx: "react-jsxdev",
      jsxImportSource: "react",
    },
  },
});
const transformedJavaScript = transpiler.transformSync(
  transformedSource,
  "tsx",
);

const tempModuleUrl = new URL(
  `./.sync-events-overlay-${process.pid}-${Date.now()}.mjs`,
  import.meta.url,
);
await writeFile(tempModuleUrl, transformedJavaScript);

const { SyncEventsOverlay } = await import(tempModuleUrl.href);

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

  afterAll(() => {
    mock.restore();
  });

  const runPendingTimers = () => {
    const timers = pendingTimers;
    pendingTimers = [];

    for (const timer of timers) {
      timer();
    }
  };

  const renderWithAuthStatus = (status: "idle" | "authenticating") => {
    authStatus = status;
    return render(<SyncEventsOverlay />);
  };

  it("renders nothing when not authenticating", () => {
    renderWithAuthStatus("idle");

    expect(screen.queryByText("Complete Google sign-in...")).toBeNull();
    expect(document.body.getAttribute("data-app-locked")).toBeNull();
  });

  it("renders OAuth message when authenticating", () => {
    renderWithAuthStatus("authenticating");

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
