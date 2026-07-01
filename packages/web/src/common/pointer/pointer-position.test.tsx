import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { type ReactNode } from "react";
import { ID_GRID_MAIN, ID_ROOT } from "@web/common/constants/web.constants";
import {
  cursorStore,
  PointerPositionProvider,
  pointerStateStore,
} from "@web/common/pointer/pointer-position";
import { useSetupMovementEvents } from "@web/common/pointer/useMovementEvent";
import {
  setPointerDown,
  setSelectionStart,
} from "@web/common/utils/dom/event-emitter.util";
import { beforeEach, describe, expect, it, mock } from "bun:test";

function renderWithPointerProvider(children: ReactNode) {
  function Wrapper({ children }: { children: ReactNode }) {
    useSetupMovementEvents();

    return <PointerPositionProvider>{children}</PointerPositionProvider>;
  }

  return render(<Wrapper>{children}</Wrapper>);
}

describe("PointerPositionProvider", () => {
  beforeEach(() => {
    setPointerDown(false);
    setSelectionStart(null);
    cursorStore.set({ x: 0, y: 0 });
    pointerStateStore.set({
      event: new PointerEvent("none", { button: 1 }) as never,
      pointerdown: false,
      selectionStart: null,
      isOverGrid: false,
      isOverSidebar: false,
      isOverMainGrid: false,
      isOverSomedayWeek: false,
      isOverSomedayMonth: false,
      isOverAllDayRow: false,
    });
  });

  it("tracks real pointer movement over the main grid", async () => {
    renderWithPointerProvider(
      <div id={ID_ROOT}>
        <div data-testid="day-grid" id={ID_GRID_MAIN} />
      </div>,
    );

    const grid = screen.getByTestId("day-grid");
    document.elementFromPoint = mock(() => grid);

    fireEvent.pointerDown(grid, {
      button: 0,
      buttons: 1,
      clientX: 100,
      clientY: 100,
    });
    fireEvent.pointerMove(grid, {
      button: -1,
      buttons: 1,
      clientX: 100,
      clientY: 130,
    });

    await waitFor(() => {
      expect(cursorStore.get()).toEqual({ x: 100, y: 130 });
      expect(pointerStateStore.get()).toEqual(
        expect.objectContaining({
          event: expect.objectContaining({ type: "pointermove" }),
          isOverGrid: true,
          isOverMainGrid: true,
          pointerdown: true,
          selectionStart: { clientX: 100, clientY: 100 },
        }),
      );
    });
  });
});
