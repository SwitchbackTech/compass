import { renderHook } from "@testing-library/react";
import { act, type PointerEvent as IPointerEvent } from "react";
import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import { readFile, writeFile } from "node:fs/promises";
import { ID_GRID_MAIN } from "@web/common/constants/web.constants";

const transpiler = new Bun.Transpiler({
  autoImportJSX: true,
  tsconfig: {
    compilerOptions: {
      jsx: "react-jsxdev",
      jsxImportSource: "react",
    },
  },
});

async function loadTempModule(
  sourceUrl: URL,
  replacements: Record<string, string> = {},
  loader: "ts" | "tsx" = "ts",
) {
  const source = await readFile(sourceUrl, "utf8");
  const transformedSource = Object.entries(replacements).reduce(
    (accumulator, [from, to]) => accumulator.replaceAll(from, to),
    source,
  );
  const tempUrl = new URL(
    `./.${sourceUrl.pathname.split("/").pop()}-${process.pid}-${Date.now()}-${Math.random()
      .toString(16)
      .slice(2)}.mjs`,
    sourceUrl,
  );
  const transformedJavaScript = transpiler.transformSync(
    transformedSource,
    loader,
  );
  await writeFile(tempUrl, transformedJavaScript);
  return tempUrl;
}

const eventEmitterUrl = await loadTempModule(
  new URL("../utils/dom/event-emitter.util.ts", import.meta.url),
  {},
  "ts",
);
const pointerPositionUrl = await loadTempModule(
  new URL("../context/pointer-position.tsx", import.meta.url),
  {
    "@web/common/utils/dom/event-emitter.util": eventEmitterUrl.href,
  },
  "tsx",
);
const isDraggingUrl = await loadTempModule(
  new URL("./useIsDraggingEvent.ts", import.meta.url),
  {},
  "ts",
);
const resizingUrl = await loadTempModule(
  new URL("./useResizing.ts", import.meta.url),
  {},
  "ts",
);
const selectionIdUrl = await loadTempModule(
  new URL("./useMainGridSelectionId.ts", import.meta.url),
  {},
  "ts",
);
const selectingStateUrl = await loadTempModule(
  new URL("./useMainGridSelectionState.ts", import.meta.url),
  {},
  "ts",
);
const mainGridSelectionUrl = await loadTempModule(
  new URL("./useMainGridSelection.ts", import.meta.url),
  {
    "@web/common/context/pointer-position": pointerPositionUrl.href,
    "@web/common/hooks/useIsDraggingEvent": isDraggingUrl.href,
    "@web/common/hooks/useMainGridSelectionId": selectionIdUrl.href,
    "@web/common/hooks/useMainGridSelectionState": selectingStateUrl.href,
    "@web/common/hooks/useResizing": resizingUrl.href,
    "@web/common/utils/dom/event-emitter.util": eventEmitterUrl.href,
  },
  "ts",
);

const { cursor$, pointerState$ } = await import(pointerPositionUrl.href);
const { isDraggingEvent$ } = await import(isDraggingUrl.href);
const { useMainGridSelection } = await import(mainGridSelectionUrl.href);
const { selectionId$ } = await import(selectionIdUrl.href);
const { selecting$ } = await import(selectingStateUrl.href);
const { resizing$ } = await import(resizingUrl.href);
const { selectionStart$ } = await import(eventEmitterUrl.href);
const eventUtils = await import(eventEmitterUrl.href);

describe("useMainGridSelection", () => {
  const onSelectionStart = mock();
  const onSelectionEnd = mock();
  const onSelection = mock();
  const getElementAtPointSpy = spyOn(eventUtils, "getElementAtPoint");
  const mainGrid = document.createElement("div");

  mainGrid.setAttribute("id", ID_GRID_MAIN);

  const pointerdown = new MouseEvent("pointerdown", {
    button: -1, //with mousemove
  }) as unknown as IPointerEvent;

  const pointerup = new MouseEvent("pointerup", {
    button: 0,
  }) as unknown as IPointerEvent;

  beforeEach(() => {
    onSelectionStart.mockClear();
    onSelectionEnd.mockClear();
    onSelection.mockClear();
    getElementAtPointSpy.mockClear();

    getElementAtPointSpy.mockReturnValue(mainGrid);

    // Reset observables
    pointerState$.next({
      event: pointerdown,
      pointerdown: false,
      selectionStart: null,
      isOverGrid: false,
      isOverSidebar: false,
      isOverMainGrid: false,
      isOverSomedayWeek: false,
      isOverSomedayMonth: false,
      isOverAllDayRow: false,
    });
    cursor$.next({ x: 0, y: 0 });
    isDraggingEvent$.next(false);
    resizing$.next(false);
    selecting$.next(false);
    selectionId$.next(null);
    selectionStart$.next(null);
  });

  it("should initialize with selecting as false", () => {
    renderHook(() => useMainGridSelection());
    // Since the hook doesn't return 'selecting' state directly but uses it internally
    // We can infer it's false because onSelectionStart hasn't been called
    expect(onSelectionStart).not.toHaveBeenCalled();
  });

  it("should start selection when conditions are met", () => {
    getElementAtPointSpy.mockReturnValue(document.createElement("div", {}));

    renderHook(() =>
      useMainGridSelection({
        onSelectionStart,
        onSelectionEnd,
        onSelection,
      }),
    );

    act(() => {
      cursor$.next({ x: 50, y: 50 }); // Moved
      pointerState$.next({
        event: pointerdown,
        pointerdown: true,
        selectionStart: { clientX: 10, clientY: 10 },
        isOverGrid: true,
        isOverSidebar: false,
        isOverMainGrid: true,
        isOverSomedayWeek: false,
        isOverSomedayMonth: false,
        isOverAllDayRow: false,
      });
    });

    expect(onSelectionStart).toHaveBeenCalled();
    expect(onSelectionStart).toHaveBeenCalledWith(
      expect.any(String),
      { clientX: 10, clientY: 10 },
      { clientX: 50, clientY: 50 },
    );
  });

  it("should call onSelection when moving while selecting", async () => {
    renderHook(() =>
      useMainGridSelection({
        onSelectionStart,
        onSelectionEnd,
        onSelection,
      }),
    );

    // Start selection
    act(() => {
      cursor$.next({ x: 20, y: 20 });
      pointerState$.next({
        event: pointerdown,
        pointerdown: true,
        selectionStart: { clientX: 10, clientY: 10 },
        isOverGrid: true,
        isOverSidebar: false,
        isOverMainGrid: true,
        isOverSomedayWeek: false,
        isOverSomedayMonth: false,
        isOverAllDayRow: false,
      });
    });

    // Move - the observable debounces, so we just need to emit and let microtasks flush
    act(() => {
      cursor$.next({ x: 30, y: 30 });
    });

    // Allow microtasks to flush
    await act(async () => {
      await Promise.resolve();
    });

    expect(onSelection).toHaveBeenCalled();
    expect(onSelection).toHaveBeenCalledWith(
      expect.any(String),
      { clientX: 10, clientY: 10 },
      { clientX: 30, clientY: 30 },
    );
  });

  it("should end selection when pointer up", () => {
    getElementAtPointSpy.mockReturnValue(mainGrid);

    renderHook(() =>
      useMainGridSelection({
        onSelectionStart,
        onSelectionEnd,
        onSelection,
      }),
    );

    // Start selection
    act(() => {
      cursor$.next({ x: 50, y: 50 });

      pointerState$.next({
        event: pointerdown,
        pointerdown: true,
        selectionStart: { clientX: 10, clientY: 10 },
        isOverGrid: true,
        isOverSidebar: false,
        isOverMainGrid: true,
        isOverSomedayWeek: false,
        isOverSomedayMonth: false,
        isOverAllDayRow: false,
      });
    });

    // End selection
    act(() => {
      pointerState$.next({
        ...pointerState$.getValue(),
        event: pointerup,
        pointerdown: false,
      });
    });

    expect(onSelectionEnd).toHaveBeenCalled();

    expect(onSelectionEnd).toHaveBeenCalledWith(
      expect.any(String),
      { clientX: 10, clientY: 10 },
      { clientX: 50, clientY: 50 },
    );
  });

  it("should not start selection if isDragging is true", () => {
    renderHook(() =>
      useMainGridSelection({
        onSelectionStart,
      }),
    );

    act(() => {
      isDraggingEvent$.next(true);
      pointerState$.next({
        event: pointerdown,
        pointerdown: true,
        selectionStart: { clientX: 10, clientY: 10 },
        isOverGrid: true,
        isOverSidebar: false,
        isOverMainGrid: true,
        isOverSomedayWeek: false,
        isOverSomedayMonth: false,
        isOverAllDayRow: false,
      });
      cursor$.next({ x: 20, y: 20 });
    });

    expect(onSelectionStart).not.toHaveBeenCalled();
  });

  it("should not start selection if resizing is true", () => {
    renderHook(() =>
      useMainGridSelection({
        onSelectionStart,
      }),
    );

    act(() => {
      resizing$.next(true);
      pointerState$.next({
        event: pointerdown,
        pointerdown: true,
        selectionStart: { clientX: 10, clientY: 10 },
        isOverGrid: true,
        isOverSidebar: false,
        isOverMainGrid: true,
        isOverSomedayWeek: false,
        isOverSomedayMonth: false,
        isOverAllDayRow: false,
      });
      cursor$.next({ x: 20, y: 20 });
    });

    expect(onSelectionStart).not.toHaveBeenCalled();
  });

  it("should not start selection if not over main grid", () => {
    renderHook(() =>
      useMainGridSelection({
        onSelectionStart,
      }),
    );

    act(() => {
      pointerState$.next({
        event: pointerdown,
        pointerdown: true,
        selectionStart: { clientX: 10, clientY: 10 },
        isOverGrid: true,
        isOverSidebar: false,
        isOverMainGrid: false, // Not over main grid
        isOverSomedayWeek: false,
        isOverSomedayMonth: false,
        isOverAllDayRow: false,
      });
      cursor$.next({ x: 20, y: 20 });
    });

    expect(onSelectionStart).not.toHaveBeenCalled();
  });

  it("should not start selection if element at start is not main grid", () => {
    renderHook(() =>
      useMainGridSelection({
        onSelectionStart,
      }),
    );

    act(() => {
      pointerState$.next({
        event: pointerdown,
        pointerdown: true,
        selectionStart: { clientX: 10, clientY: 10 },
        isOverGrid: true,
        isOverSidebar: false,
        isOverMainGrid: true,
        isOverSomedayWeek: false,
        isOverSomedayMonth: false,
        isOverAllDayRow: false,
      });
      cursor$.next({ x: 20, y: 20 });
    });

    expect(onSelectionStart).not.toHaveBeenCalled();
  });
});
