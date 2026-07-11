import { type CalendarInteractionPoint } from "@web/interaction/CalendarInteractionSession";

export interface ClampZoneRect {
  bottom: number;
  left: number;
  right: number;
  top: number;
}

const clampToRange = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

/**
 * Clamps a point into the union of zones by clamping it into each zone
 * independently and keeping the candidate nearest to the raw point. The
 * union is non-convex (sidebar sections sit beside the grid), so the preview
 * slides along the boundary of whichever zone is closest instead of escaping
 * into dead areas like the week header.
 */
export const clampPointToZones = (
  point: CalendarInteractionPoint,
  zones: ClampZoneRect[],
): CalendarInteractionPoint => {
  let closest: CalendarInteractionPoint | null = null;
  let closestDistance = Number.POSITIVE_INFINITY;

  for (const zone of zones) {
    const x = clampToRange(point.x, zone.left, zone.right);
    const y = clampToRange(point.y, zone.top, zone.bottom);
    const distance = (x - point.x) ** 2 + (y - point.y) ** 2;

    if (distance < closestDistance) {
      closest = { x, y };
      closestDistance = distance;
    }
  }

  return closest ?? point;
};
