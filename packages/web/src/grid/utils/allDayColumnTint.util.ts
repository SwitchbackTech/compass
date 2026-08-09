import { type EventColorSlot } from "@core/types/event-color.contracts";
import { type CSSVariables } from "@web/common/styles/css.types";
import { getEventPalette } from "@web/common/styles/theme.util";
import { type GridEvent } from "@web/common/types/web.event.types";
import { type GridVisibleDate } from "@web/grid/types/grid.types";
import { isAllDayEventOnDay } from "@web/views/Day/components/Calendar/dayAllDayRows.util";

/** Opacity of the all-day event color wash on day columns (Vimcal-like). */
export const ALL_DAY_COLUMN_TINT_PERCENT = 8;

export type AllDayColumnTintMode = "date" | "calendar";

export type AllDayColumnTintEvent = Pick<
  GridEvent,
  "startDate" | "endDate" | "row" | "color" | "colorHex" | "calendarId"
>;

/**
 * CSS background for a column tinted by an all-day event fill color.
 * Keeps the stored hex opaque; opacity is applied only at paint time.
 */
export const allDayColumnTintBackground = (hex: string): string =>
  `color-mix(in srgb, ${hex} ${ALL_DAY_COLUMN_TINT_PERCENT}%, transparent)`;

/**
 * Inline column paint for an all-day tint. Jump-day wash wins, so this returns
 * undefined when jump-day is active or no tint color is set.
 */
export const allDayColumnTintStyle = (
  tintColor: string | undefined,
  isJumpDay: boolean,
): CSSVariables | undefined => {
  if (tintColor === undefined || isJumpDay) {
    return undefined;
  }
  return {
    "--column-all-day-tint": tintColor,
    backgroundColor: allDayColumnTintBackground(tintColor),
  };
};

const resolveTintHex = (color?: EventColorSlot, colorHex?: string): string =>
  getEventPalette(color, colorHex).base;

const eventBelongsToCalendarColumn = (
  event: AllDayColumnTintEvent,
  column: GridVisibleDate,
  columnIndex: number,
  fallbackKey: string | undefined,
): boolean => {
  if (event.calendarId !== undefined) {
    return event.calendarId === column.key;
  }
  // Untitled / local drafts without a calendar land in the first column.
  return columnIndex === 0 && column.key === fallbackKey;
};

const considerWinner = (
  winners: Map<string, AllDayColumnTintEvent>,
  columnKey: string,
  event: AllDayColumnTintEvent,
) => {
  // Missing row sorts last so packed chips always beat unassigned ones;
  // equal rows keep the first encounter (topmost chip in input order).
  const row = event.row ?? Number.POSITIVE_INFINITY;
  const existing = winners.get(columnKey);
  if (
    existing !== undefined &&
    row >= (existing.row ?? Number.POSITIVE_INFINITY)
  ) {
    return;
  }
  winners.set(columnKey, event);
};

/**
 * Attaches `allDayTintColor` from the topmost all-day chip on each column.
 * - `date`: week columns — tint every day the event's exclusive span covers.
 * - `calendar`: day columns — tint only the calendar column that owns the chip.
 */
export const withAllDayColumnTints = (
  visibleDates: GridVisibleDate[],
  allDayEvents: AllDayColumnTintEvent[],
  mode: AllDayColumnTintMode,
): GridVisibleDate[] => {
  if (visibleDates.length === 0 || allDayEvents.length === 0) {
    return visibleDates;
  }

  const winners = new Map<string, AllDayColumnTintEvent>();
  const fallbackCalendarKey = visibleDates[0]?.key;

  for (const [columnIndex, column] of visibleDates.entries()) {
    for (const event of allDayEvents) {
      if (mode === "date") {
        if (!isAllDayEventOnDay(event, column.date)) {
          continue;
        }
      } else if (
        !eventBelongsToCalendarColumn(
          event,
          column,
          columnIndex,
          fallbackCalendarKey,
        )
      ) {
        continue;
      }

      considerWinner(winners, column.key, event);
    }
  }

  if (winners.size === 0) {
    return visibleDates;
  }

  return visibleDates.map((column) => {
    const winner = winners.get(column.key);
    if (winner === undefined) {
      return column;
    }
    return {
      ...column,
      allDayTintColor: resolveTintHex(winner.color, winner.colorHex),
    };
  });
};
