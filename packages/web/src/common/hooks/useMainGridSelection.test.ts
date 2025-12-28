import { PointerEvent as IPointerEvent, act } from "react";
import { renderHook } from "@testing-library/react";
import { ID_GRID_MAIN } from "@web/common/constants/web.constants";
import { cursor$, pointerState$ } from "@web/common/context/pointer-position";
import { isDraggingEvent$ } from "@web/common/hooks/useIsDraggingEvent";
import { useMainGridSelection } from "@web/common/hooks/useMainGridSelection";
import { resizing$ } from "@web/common/hooks/useResizing";
import * as eventUtils from "@web/common/utils/dom/event-emitter.util";

describe("useMainGridSelection", () => {
  const onSelectionStart = jest.fn();
  const onSelectionEnd = jest.fn();
  const onSelection = jest.fn();
  const getElementAtPointSpy = jest.spyOn(eventUtils, "getElementAtPoint");
  const mainGrid = document.createElement("div");

  mainGrid.setAttribute("id", ID_GRID_MAIN);

  const pointerdown = new MouseEvent("pointerdown", {
    button: -1, //with mousemove
  }) as unknown as IPointerEvent;

  const pointerup = new MouseEvent("pointerup", {
    button: 0,
  }) as unknown as IPointerEvent;

  beforeEach(() => {
    jest.clearAllMocks();

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

  it("should call onSelection when moving while selecting", () => {
    jest.useFakeTimers();

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

    // Move
    act(() => {
      cursor$.next({ x: 30, y: 30 });
      jest.advanceTimersByTime(100);
    });

    expect(onSelection).toHaveBeenCalled();
    expect(onSelection).toHaveBeenCalledWith(
      expect.any(String),
      { clientX: 10, clientY: 10 },
      { clientX: 30, clientY: 30 },
    );
    jest.useRealTimers();
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
