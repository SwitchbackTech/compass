import { useEffect, useState } from "react";
import {
  type PointerState,
  pointerState$,
} from "@web/common/context/pointer-position";

export function usePointerState(): PointerState {
  const state = pointerState$.getValue();
  const [pointerdown, setPointerdown] = useState<boolean>(state.pointerdown);
  const [isOverGrid, setIsOverGrid] = useState<boolean>(state.isOverGrid);
  const [isOverSidebar, setOverSide] = useState<boolean>(state.isOverSidebar);
  const [isOverMainGrid, setOverGrid] = useState<boolean>(state.isOverMainGrid);
  const [isOverWeek, setWeek] = useState<boolean>(state.isOverSomedayWeek);
  const [isOverMonth, setMonth] = useState<boolean>(state.isOverSomedayMonth);
  const [isOverAllDayRow, setDay] = useState<boolean>(state.isOverAllDayRow);
  const [event, setEvent] = useState<PointerState["event"]>(state.event);
  const [selectionStart, setSelectionStart] = useState<
    PointerState["selectionStart"]
  >(state.selectionStart);

  useEffect(() => {
    const subscription = pointerState$.subscribe((value) => {
      setPointerdown(value.pointerdown);
      setEvent(value.event);
      setSelectionStart(value.selectionStart);
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
    pointerdown,
    event,
    selectionStart,
    isOverGrid,
    isOverSidebar,
    isOverMainGrid,
    isOverSomedayWeek: isOverWeek,
    isOverSomedayMonth: isOverMonth,
    isOverAllDayRow,
  };
}
