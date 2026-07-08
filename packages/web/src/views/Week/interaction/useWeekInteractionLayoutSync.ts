import { useLayoutEffect, useMemo } from "react";
import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import { type WeekProps } from "@web/views/Week/hooks/useWeek";

interface RebuildableAdapter {
  rebuildLayoutAfterNavigation(): void;
}

/**
 * Shared coordinator wiring for interaction adapters that read the rendered
 * week window: returns the visible days as local YYYY-MM-DD keys (for the
 * adapter runtime's getVisibleDays) and rebuilds the adapter's drag layout
 * after a mid-drag edge navigation re-renders the window. The rebuild is
 * keyed on the first *visible* day, not startOfView — within-week window
 * paging shifts the rendered columns without changing startOfView.
 */
export function useWeekInteractionLayoutSync(
  adapter: RebuildableAdapter,
  weekProps: WeekProps,
): string[] {
  const visibleDayKeys = useMemo(
    () =>
      weekProps.component.weekDays.map((day) =>
        day.format(YEAR_MONTH_DAY_FORMAT),
      ),
    [weekProps.component.weekDays],
  );
  const lastNavigationSource = weekProps.util.getLastNavigationSource();
  const renderedFirstDayMs =
    weekProps.component.weekDays[0]?.valueOf() ?? Number.NaN;

  useLayoutEffect(() => {
    if (
      lastNavigationSource !== "drag-to-edge" ||
      !Number.isFinite(renderedFirstDayMs)
    ) {
      return;
    }

    adapter.rebuildLayoutAfterNavigation();
  }, [adapter, lastNavigationSource, renderedFirstDayMs]);

  return visibleDayKeys;
}
