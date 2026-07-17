import { type DragRow } from "./types/timed-drag.types";

export interface GridLayoutCacheSources {
  allDayColumnsElement?: HTMLElement | null;
  mainGridElement?: HTMLElement | null;
  timedColumnsElement?: HTMLElement | null;
}

export interface GridLayoutCacheOptions {
  allDayColumnsElementId?: string;
  edgeThresholdPx: number;
  mainGridElementId?: string;
  snapMinutes: number;
  smartScroll?: {
    bottomInsetPx: number;
    speedPx: number;
  };
  timedColumnsElementId?: string;
  timedVisibleHours: number;
  /** Local YYYY-MM-DD dates of the rendered day columns, in window order. */
  visibleDates: string[];
}

export interface DayColumnCache {
  /** Local YYYY-MM-DD date this column renders. */
  date: string;
  index: number;
  left: number;
  width: number;
}

export interface EdgeNavigationCache {
  bottom: number;
  edgeThresholdPx: number;
  left: number;
  right: number;
  top: number;
}

export interface SmartScrollCache {
  bottom: number;
  edgeThresholdPx: number;
  element: HTMLElement;
  initialScrollTop: number;
  maxScrollTop: number;
  speedPx: number;
  top: number;
}

export interface GridLayoutCache {
  /**
   * The *other* row's geometry, so a drag can hit-test the pointer against both
   * rows every frame and drop across them. Built for drags only (see
   * buildDragGridLayoutCache); resizes stay within one row and leave it
   * unset, as do layouts where the other row isn't on screen.
   */
  crossRow?: GridLayoutCache;
  dayColumns: DayColumnCache[];
  edgeNavigation: EdgeNavigationCache;
  pixelsPerMinute: number;
  snapMinutes: number;
  smartScroll?: SmartScrollCache;
}

interface BuildDayColumnsInput {
  left: number;
  visibleDates: string[];
  width: number;
}

export const buildTimedGridLayoutCache = ({
  edgeThresholdPx,
  mainGridElement,
  mainGridElementId,
  smartScroll,
  snapMinutes,
  timedColumnsElement,
  timedColumnsElementId,
  timedVisibleHours,
  visibleDates,
}: GridLayoutCacheOptions & GridLayoutCacheSources): GridLayoutCache | null => {
  const mainGrid = mainGridElement ?? getElementById(mainGridElementId);

  if (!mainGrid || visibleDates.length === 0) {
    return null;
  }

  const rect = mainGrid.getBoundingClientRect();
  const columnsRect =
    getElementRect(timedColumnsElement) ??
    getElementRect(getElementById(timedColumnsElementId)) ??
    rect;

  return {
    dayColumns: buildDayColumns(columnsRect, visibleDates),
    edgeNavigation: {
      bottom: rect.bottom,
      edgeThresholdPx,
      left: columnsRect.left,
      right: columnsRect.right,
      top: rect.top,
    },
    pixelsPerMinute: rect.height / (timedVisibleHours * 60),
    snapMinutes,
    smartScroll: smartScroll
      ? {
          bottom: rect.bottom - smartScroll.bottomInsetPx,
          edgeThresholdPx,
          element: mainGrid,
          initialScrollTop: mainGrid.scrollTop,
          maxScrollTop: Math.max(
            0,
            mainGrid.scrollHeight - mainGrid.clientHeight,
          ),
          speedPx: smartScroll.speedPx,
          top: rect.top,
        }
      : undefined,
  };
};

export const buildAllDayGridLayoutCache = ({
  allDayColumnsElement,
  allDayColumnsElementId,
  edgeThresholdPx,
  snapMinutes,
  visibleDates,
}: GridLayoutCacheOptions & GridLayoutCacheSources): GridLayoutCache | null => {
  const rect = getElementRect(
    allDayColumnsElement ?? getElementById(allDayColumnsElementId),
  );

  if (!rect || visibleDates.length === 0) {
    return null;
  }

  return {
    dayColumns: buildDayColumns(rect, visibleDates),
    edgeNavigation: {
      bottom: rect.bottom,
      edgeThresholdPx,
      left: rect.left,
      right: rect.right,
      top: rect.top,
    },
    pixelsPerMinute: 1,
    snapMinutes,
  };
};

/**
 * Pairs the drag's own row geometry (primary, so every existing same-row
 * consumer reads it unchanged) with the other row's on `crossRow`. Returns null
 * only when the drag's own row is missing — a missing *other* row just leaves
 * `crossRow` unset, which keeps the drag on its same-row path.
 */
export const buildDragGridLayoutCache = (
  options: GridLayoutCacheOptions & GridLayoutCacheSources,
  sourceRow: DragRow,
): GridLayoutCache | null => {
  const allDay = buildAllDayGridLayoutCache(options);
  const timed = buildTimedGridLayoutCache(options);
  const [primary, crossRow] =
    sourceRow === "allDay" ? [allDay, timed] : [timed, allDay];

  return primary ? { ...primary, crossRow: crossRow ?? undefined } : null;
};

export function buildDayColumns(input: BuildDayColumnsInput): DayColumnCache[];
export function buildDayColumns(
  input: Pick<DOMRect, "left" | "width">,
  visibleDates: string[],
): DayColumnCache[];
export function buildDayColumns(
  input: BuildDayColumnsInput | Pick<DOMRect, "left" | "width">,
  visibleDates?: string[],
): DayColumnCache[] {
  const dates = visibleDates ?? (input as BuildDayColumnsInput).visibleDates;

  if (dates.length === 0) {
    return [];
  }

  const columnWidth = input.width / dates.length;

  return dates.map((date, index) => ({
    date,
    index,
    left: input.left + columnWidth * index,
    width: columnWidth,
  }));
}

export const getNearestDayColumn = (columns: DayColumnCache[], x: number) => {
  let nearest: DayColumnCache | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const column of columns) {
    const center = column.left + column.width / 2;
    const distance = Math.abs(center - x);

    if (distance < nearestDistance) {
      nearest = column;
      nearestDistance = distance;
    }
  }

  return nearest;
};

const getElementById = (id: string | undefined) =>
  id ? document.getElementById(id) : null;

const getElementRect = (element: HTMLElement | null | undefined) => {
  const rect = element?.getBoundingClientRect();

  return rect && rect.width > 0 ? rect : null;
};
