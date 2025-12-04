import {
  Dispatch,
  PropsWithChildren,
  createContext,
  useCallback,
  useMemo,
  useState,
} from "react";
import { Subject } from "rxjs";
import {
  Placement,
  ReferenceType,
  Strategy,
  UseFloatingOptions,
  UseInteractionsReturn,
  autoUpdate,
  flip,
  offset,
  shift,
  useDismiss,
  useFloating,
  useInteractions,
} from "@floating-ui/react";
import {
  COLUMN_MONTH,
  COLUMN_WEEK,
  ID_GRID_ALLDAY_ROW,
  ID_GRID_MAIN,
  ID_ROOT,
  ID_SIDEBAR,
} from "@web/common/constants/web.constants";
import { useMovementEvent } from "@web/common/hooks/useMovementEvent";
import { Coordinates } from "@web/common/types/util.types";
import { DomMovement } from "@web/common/utils/dom-events/event-emitter.util";

type Floating = ReturnType<typeof useFloating>;

type OpenChangeParams = Parameters<
  Exclude<UseFloatingOptions["onOpenChange"], undefined>
>;

interface MousePosition {
  caret: CaretPosition | null;
  element: Element | null;
  mousedown: boolean;
  isOverGrid: boolean;
  mouseCoords: Coordinates;
  isOverSidebar: boolean;
  isOverMainGrid: boolean;
  isOverSomedayWeek: boolean;
  isOverSomedayMonth: boolean;
  selectionStart: Coordinates | null;
  isOverAllDayRow: boolean;
  isOpenAtMouse: boolean;
  openChange$: Subject<OpenChangeParams>;
  floating: (Floating & UseInteractionsReturn) | null;
  mousePointRef: ReferenceType | null;
  setOpenAtMousePosition: Dispatch<React.SetStateAction<boolean>>;
  toggleMouseMovementTracking: (pauseTracking?: boolean) => void;
}

const openChange$ = new Subject<OpenChangeParams>();

export const MousePositionContext = createContext<MousePosition>({
  caret: null,
  element: null,
  floating: null,
  mousedown: false,
  isOverGrid: false,
  isOverSidebar: false,
  openChange$,
  mouseCoords: { x: 0, y: 0 },
  mousePointRef: null,
  isOverMainGrid: false,
  isOpenAtMouse: false,
  selectionStart: null,
  isOverAllDayRow: false,
  isOverSomedayWeek: false,
  isOverSomedayMonth: false,
  setOpenAtMousePosition: () => {}, // no-op fn
  toggleMouseMovementTracking: () => {}, // no-op fn
});

export function MousePositionProvider({ children }: PropsWithChildren<{}>) {
  const [isOverSidebar, setIsOverSidebar] = useState(false);
  const [isOverSomedayWeek, setIsOverSomedayWeek] = useState(false);
  const [isOverSomedayMonth, setIsOverSomedayMonth] = useState(false);
  const [isOverGrid, setIsOverGrid] = useState(false);
  const [isOverMainGrid, setIsOverMainGrid] = useState(false);
  const [isOverAllDayRow, setIsOverAllDayRow] = useState(false);
  const [mouseCoords, setMouseCoords] = useState<Coordinates>({ x: 0, y: 0 });
  const [caret, setCaretPosition] = useState<CaretPosition | null>(null);
  const [mousedown, setMousedown] = useState<boolean>(false);
  const [selectionStart, setStart] = useState<Coordinates | null>(null);
  const [element, setElement] = useState<Element | null>(null);
  const [isOpenAtMouse, setOpenAtMousePosition] = useState<boolean>(false);
  const [strategy, setStrategy] = useState<Strategy>("fixed");
  const [placement, setPlacement] = useState<Placement>("right-start");

  const { x, y } = mouseCoords;

  const handler = useCallback(
    ({ x, y, element, mousedown, caret, selectionStart }: DomMovement) => {
      const overSidebar = !!element?.closest(`#${ID_SIDEBAR}`);
      const overSomedayWeek = !!element?.closest(`#${COLUMN_WEEK}`);
      const overSomedayMonth = !!element?.closest(`#${COLUMN_MONTH}`);
      const overAllDayRow = !!element?.closest(`#${ID_GRID_ALLDAY_ROW}`);
      const overMainGrid = !!element?.closest(`#${ID_GRID_MAIN}`);
      const overGrid = overAllDayRow || overMainGrid;

      setIsOverSidebar(overSidebar);
      setIsOverSomedayWeek(overSomedayWeek);
      setIsOverSomedayMonth(overSomedayMonth);
      setIsOverGrid(overGrid);
      setIsOverAllDayRow(overAllDayRow);
      setIsOverMainGrid(overMainGrid);
      setMouseCoords({ x, y });
      setCaretPosition(caret);
      setMousedown(mousedown);
      setElement(element);
      setStrategy("fixed");
      setPlacement("right-start");
      setStart({
        x: selectionStart?.clientX ?? 0,
        y: selectionStart?.clientY ?? 0,
      });

      if (overSidebar) setStrategy("absolute");
      if (overSomedayMonth) setPlacement("right");
    },
    [
      setIsOverSidebar,
      setIsOverSomedayWeek,
      setIsOverSomedayMonth,
      setIsOverGrid,
      setIsOverAllDayRow,
      setIsOverMainGrid,
      setMouseCoords,
      setCaretPosition,
      setMousedown,
      setElement,
      setStrategy,
      setPlacement,
      setStart,
    ],
  );

  const { toggleMouseMovementTracking } = useMovementEvent({
    selectors: [`#${ID_ROOT}`],
    handler,
    deps: [
      setIsOverSidebar,
      setIsOverGrid,
      setIsOverAllDayRow,
      setIsOverMainGrid,
      setMouseCoords,
      setCaretPosition,
      setMousedown,
    ],
  });

  const floating = useFloating({
    placement,
    strategy,
    middleware: [
      flip({
        fallbackPlacements: [
          "right-start",
          "right",
          "left-start",
          "left",
          "top-start",
          "bottom-start",
          "top",
          "bottom",
        ],
        fallbackStrategy: "bestFit",
      }),
      offset(7),
      shift(),
    ],
    open: isOpenAtMouse,
    onOpenChange: (open, event, reason) => {
      setOpenAtMousePosition(open);
      openChange$.next([open, event, reason]);
    },
    whileElementsMounted: autoUpdate,
  });

  const dismiss = useDismiss(floating.context);
  const interactions = useInteractions([dismiss]);

  const mousePointRef = useMemo<ReferenceType>(
    () => ({
      getBoundingClientRect: () => ({
        x,
        y,
        top: y,
        left: x,
        bottom: y,
        right: x,
        width: 0,
        height: 0,
        toJSON: () => ({}),
      }),
    }),
    [x, y],
  );

  return (
    <MousePositionContext.Provider
      value={{
        caret,
        element,
        floating: { ...floating, ...interactions },
        mousedown,
        isOverGrid,
        mouseCoords,
        openChange$,
        mousePointRef,
        isOpenAtMouse,
        isOverSidebar,
        isOverMainGrid,
        selectionStart,
        isOverAllDayRow,
        isOverSomedayWeek,
        isOverSomedayMonth,
        setOpenAtMousePosition,
        toggleMouseMovementTracking,
      }}
    >
      {children}
    </MousePositionContext.Provider>
  );
}
