import { type SmartScrollCache } from "../math/smartScroll";

export interface WeekDayColumnCache {
  index: number;
  left: number;
  width: number;
}

export interface WeekLayoutCache {
  dayColumns: WeekDayColumnCache[];
  edgeNavigation?: WeekEdgeNavigationCache;
  pixelsPerMinute: number;
  snapMinutes: number;
  smartScroll?: SmartScrollCache;
}

export interface WeekEdgeNavigationCache {
  bottom: number;
  edgeThresholdPx: number;
  left: number;
  right: number;
  top: number;
}

export const getNearestDayColumn = (
  columns: WeekDayColumnCache[],
  x: number,
) => {
  let nearest: WeekDayColumnCache | null = null;
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
