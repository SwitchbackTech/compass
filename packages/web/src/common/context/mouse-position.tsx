import { PropsWithChildren, createContext, useCallback } from "react";
import { BehaviorSubject } from "rxjs";
import {
  COLUMN_MONTH,
  COLUMN_WEEK,
  ID_GRID_ALLDAY_ROW,
  ID_GRID_MAIN,
  ID_ROOT,
  ID_SIDEBAR,
} from "@web/common/constants/web.constants";
import { useMovementEvent } from "@web/common/hooks/useMovementEvent";
import {
  DomMovement,
  getElementAtPoint,
} from "@web/common/utils/dom/event-emitter.util";

export interface MouseState {
  mousedown: boolean;
  isOverGrid: boolean;
  isOverSidebar: boolean;
  isOverMainGrid: boolean;
  isOverSomedayWeek: boolean;
  isOverSomedayMonth: boolean;
  isOverAllDayRow: boolean;
}

interface MousePosition {
  toggleMouseMovementTracking: (pauseTracking?: boolean) => void;
}

export const cursor$ = new BehaviorSubject<Pick<DomMovement, "x" | "y">>({
  x: 0,
  y: 0,
});

export const mouseState$ = new BehaviorSubject<MouseState>({
  mousedown: false,
  isOverGrid: false,
  isOverSidebar: false,
  isOverMainGrid: false,
  isOverSomedayWeek: false,
  isOverSomedayMonth: false,
  isOverAllDayRow: false,
});

export const MousePositionContext = createContext<MousePosition | null>(null);

export function getMousePointRef(
  cursor: Pick<MouseEvent, "clientX" | "clientY">,
) {
  const { clientX: x, clientY: y } = cursor;

  return {
    getBoundingClientRect: () => {
      return {
        x,
        y,
        top: y,
        left: x,
        bottom: y,
        right: x,
        width: 0,
        height: 0,
        toJSON: () => ({}),
      };
    },
  };
}

export function getCursorPosition(): Pick<MouseEvent, "clientX" | "clientY"> {
  const { x: clientX, y: clientY } = cursor$.getValue();

  return { clientX, clientY };
}

export function getElementAtCursor() {
  return getElementAtPoint(getCursorPosition());
}

export function isElementInViewport(
  element: Pick<Element, "getBoundingClientRect">,
) {
  const rect = element.getBoundingClientRect();

  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <=
      (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

export function isOverSidebar(element = getElementAtCursor()) {
  return !!element?.closest(`#${ID_SIDEBAR}`);
}

export function isOverSomedayWeek(element = getElementAtCursor()) {
  return !!element?.closest(`#${COLUMN_WEEK}`);
}

export function isOverSomedayMonth(element = getElementAtCursor()) {
  return !!element?.closest(`#${COLUMN_MONTH}`);
}

export function isOverAllDayRow(element = getElementAtCursor()) {
  return !!element?.closest(`#${ID_GRID_ALLDAY_ROW}`);
}

export function isOverMainGrid(element = getElementAtCursor()) {
  return !!element?.closest(`#${ID_GRID_MAIN}`);
}

export function isOverCalendarGrid(element = getElementAtCursor()) {
  return isOverAllDayRow(element) || isOverMainGrid(element);
}

export function MousePositionProvider({ children }: PropsWithChildren<{}>) {
  const handler = useCallback(({ x, y, element, mousedown }: DomMovement) => {
    cursor$.next({ x, y });
    const overSidebar = isOverSidebar(element);
    const overSomedayWeek = isOverSomedayWeek(element);
    const overSomedayMonth = isOverSomedayMonth(element);
    const overAllDayRow = isOverAllDayRow(element);
    const overMainGrid = isOverMainGrid(element);
    const overCalendarGrid = isOverCalendarGrid(element);

    mouseState$.next({
      mousedown,
      isOverSidebar: overSidebar,
      isOverSomedayWeek: overSomedayWeek,
      isOverSomedayMonth: overSomedayMonth,
      isOverAllDayRow: overAllDayRow,
      isOverMainGrid: overMainGrid,
      isOverGrid: overCalendarGrid,
    });
  }, []);

  const { toggleMouseMovementTracking } = useMovementEvent({
    selectors: [`#${ID_ROOT}`],
    handler,
  });

  return (
    <MousePositionContext.Provider value={{ toggleMouseMovementTracking }}>
      {children}
    </MousePositionContext.Provider>
  );
}
