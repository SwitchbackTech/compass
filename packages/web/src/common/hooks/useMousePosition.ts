import { useCallback, useContext, useEffect, useState } from "react";
import {
  OpenChangeReason,
  Placement,
  Strategy,
  UseFloatingOptions,
  autoUpdate,
  flip,
  offset,
  shift,
  useDismiss,
  useFloating,
  useInteractions,
} from "@floating-ui/react";
import {
  MousePositionContext,
  MouseState,
  cursor$,
  mouseState$,
} from "@web/common/context/mouse-position";

export function useMousePosition() {
  const context = useContext(MousePositionContext);

  if (!context) {
    throw new Error(
      "useMousePosition must be used within the MousePositionProvider",
    );
  }

  return context;
}

export function useMouseState(): MouseState {
  const state = mouseState$.getValue();
  const [mousedown, setMousedown] = useState<boolean>(state.mousedown);
  const [isOverGrid, setIsOverGrid] = useState<boolean>(state.isOverGrid);
  const [isOverSidebar, setOverSide] = useState<boolean>(state.isOverSidebar);
  const [isOverMainGrid, setOverGrid] = useState<boolean>(state.isOverMainGrid);
  const [isOverWeek, setWeek] = useState<boolean>(state.isOverSomedayWeek);
  const [isOverMonth, setMonth] = useState<boolean>(state.isOverSomedayMonth);
  const [isOverAllDayRow, setDay] = useState<boolean>(state.isOverAllDayRow);

  useEffect(() => {
    const subscription = mouseState$.subscribe((value) => {
      setMousedown(value.mousedown);
      setIsOverGrid(value.isOverGrid);
      setOverSide(value.isOverSidebar);
      setOverGrid(value.isOverMainGrid);
      setWeek(value.isOverSomedayWeek);
      setMonth(value.isOverSomedayMonth);
      setDay(value.isOverAllDayRow);
    });

    return () => subscription.unsubscribe();
  }, []);

  return {
    mousedown,
    isOverGrid,
    isOverSidebar,
    isOverMainGrid,
    isOverSomedayWeek: isOverWeek,
    isOverSomedayMonth: isOverMonth,
    isOverAllDayRow,
  };
}

export function useCursorCoordinates() {
  const cursor = cursor$.getValue();
  const [x, setX] = useState<number>(cursor.x);
  const [y, setY] = useState<number>(cursor.y);

  useEffect(() => {
    const subscription = cursor$.subscribe((value) => {
      setX(value.x);
      setY(value.y);
    });

    return () => subscription.unsubscribe();
  }, [setX, setY]);

  return { x, y };
}

export function useOpenAtCursorPosition({
  onOpenChange,
}: Pick<UseFloatingOptions, "onOpenChange"> = {}) {
  const [placement, setPlacement] = useState<Placement>("right-start");
  const [strategy, setStrategy] = useState<Strategy>("fixed");
  const [isOpenAtMouse, setOpenAtMousePosition] = useState<boolean>(false);

  const onOpenChanged = useCallback(
    (open: boolean, event?: Event, reason?: OpenChangeReason) => {
      setOpenAtMousePosition(open);
      onOpenChange?.(open, event, reason);
    },
    [onOpenChange],
  );

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
    onOpenChange: onOpenChanged,
    whileElementsMounted: autoUpdate,
  });

  const dismiss = useDismiss(floating.context);
  const interactions = useInteractions([dismiss]);

  return {
    isOpenAtMouse,
    floatingContext: floating.context,
    x: floating.x,
    y: floating.y,
    placement: floating.placement,
    strategy: floating.strategy,
    setFloating: floating.refs.setFloating,
    setReference: floating.refs.setReference,
    getFloatingProps: interactions.getFloatingProps,
    setOpenAtMousePosition,
    setPlacement,
    setStrategy,
  };
}
