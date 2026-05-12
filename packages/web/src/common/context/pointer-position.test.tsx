import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { type ReactNode } from "react";
import { ID_GRID_MAIN, ID_ROOT } from "@web/common/constants/web.constants";
import {
  cursor$,
  PointerPositionProvider,
  pointerState$,
} from "@web/common/context/pointer-position";
import { isDraggingEvent$ } from "@web/common/hooks/useIsDraggingEvent";
import { useMainGridSelection } from "@web/common/hooks/useMainGridSelection";
import { selectionId$ } from "@web/common/hooks/useMainGridSelectionId";
import { selecting$ } from "@web/common/hooks/useMainGridSelectionState";
import { useSetupMovementEvents } from "@web/common/hooks/useMovementEvent";
import { resizing$ } from "@web/common/hooks/useResizing";
import {
  pointerdown$,
  selectionStart$,
} from "@web/common/utils/dom/event-emitter.util";
import { beforeEach, describe, expect, it, mock } from "bun:test";

function SelectionHarness({
  onSelectionStart,
}: {
  onSelectionStart: NonNullable<
    Parameters<typeof useMainGridSelection>[0]
  >["onSelectionStart"];
}) {
  useMainGridSelection({ onSelectionStart });

  return (
    <div id={ID_ROOT}>
      <div data-testid="day-grid" id={ID_GRID_MAIN} />
    </div>
  );
}

function renderWithPointerProvider(children: ReactNode) {
  function Wrapper({ children }: { children: ReactNode }) {
    useSetupMovementEvents();

    return <PointerPositionProvider>{children}</PointerPositionProvider>;
  }

  return render(<Wrapper>{children}</Wrapper>);
}

describe("PointerPositionProvider", () => {
  beforeEach(() => {
    pointerdown$.next(false);
    selectionStart$.next(null);
    cursor$.next({ x: 0, y: 0 });
    pointerState$.next({
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
    isDraggingEvent$.next(false);
    resizing$.next(false);
    selecting$.next(false);
    selectionId$.next(null);
  });

  it("feeds real grid pointer movement into day-view selection", async () => {
    const onSelectionStart = mock();

    renderWithPointerProvider(
      <SelectionHarness onSelectionStart={onSelectionStart} />,
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
      expect(onSelectionStart).toHaveBeenCalledWith(
        expect.any(String),
        { clientX: 100, clientY: 100 },
        { clientX: 100, clientY: 130 },
      );
    });
  });
});
