export interface WeekDayColumnCache {
  index: number;
  left: number;
  width: number;
}

export interface WeekLayoutCache {
  dayColumns: WeekDayColumnCache[];
  pixelsPerMinute: number;
  snapMinutes: number;
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
