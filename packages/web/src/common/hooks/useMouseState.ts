import { useEffect, useState } from "react";
import { MouseState, mouseState$ } from "@web/common/context/mouse-position";

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
