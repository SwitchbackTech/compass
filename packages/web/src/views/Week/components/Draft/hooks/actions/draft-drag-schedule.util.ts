import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import { type Dayjs } from "@core/util/date/dayjs";
import {
  ID_GRID_ALLDAY_ROW,
  ID_GRID_MAIN,
} from "@web/common/constants/web.constants";
import { getElemById } from "@web/common/utils/grid/grid.util";
import { type GridScheduleDraft } from "@web/events/event-draft.types";
import {
  allDayGridSchedule,
  timedGridSchedule,
} from "@web/events/grid-event-draft.adapter";
import { CROSS_ROW_TIMED_DURATION_MIN } from "@web/grid/interaction/math/cross-row.drag";
import { type Status_Drag } from "@web/views/Week/components/Draft/hooks/state/useDraftState";
import { getDragDurationMinutes } from "./drag-duration.util";

export type DraftDragRow = "allDay" | "timed";

const ONE_DAY_MINUTES = 24 * 60;

/**
 * Same divider as the saved-event engine's `resolveDragRow`: the all-day row
 * rect is the boundary. Inside it the drop is all-day; anywhere else (when both
 * rows are mounted) it lands in the timed grid. Falls back to the draft's
 * current kind when either row is missing so same-row dragging still works.
 */
export const resolveDraftDragRow = (
  pointerY: number,
  sourceRow: DraftDragRow,
  getElementById: (id: string) => HTMLElement | null = getElemById,
): DraftDragRow => {
  const allDayRow = getElementById(ID_GRID_ALLDAY_ROW);
  const mainGrid = getElementById(ID_GRID_MAIN);

  if (!allDayRow || !mainGrid) {
    return sourceRow;
  }

  const rect = allDayRow.getBoundingClientRect();
  return pointerY >= rect.top && pointerY <= rect.bottom ? "allDay" : "timed";
};

interface ResolveDraftDragScheduleInput {
  clientX: number;
  clientY: number;
  dragOffset: { x: number; y: number };
  dragStatus: Status_Drag | null;
  getDateByXY: (x: number, y: number, firstDayInView: Dayjs) => Dayjs;
  schedule: GridScheduleDraft;
  startOfView: Dayjs;
  /**
   * Optional DOM lookup override for tests. Defaults to the live grid util.
   */
  getElementById?: (id: string) => HTMLElement | null;
}

export interface ResolvedDraftDragSchedule {
  durationMin: number;
  row: DraftDragRow;
  schedule: GridScheduleDraft;
}

/**
 * Maps a draft drag pointer to a schedule, including all-day ↔ timed conversion
 * when the pointer crosses the all-day / timed divider. Timed placement after a
 * cross-row conversion hangs a default-length block from the pointer (same
 * semantics as saved-event cross-row drag).
 */
export const resolveDraftDragSchedule = ({
  clientX,
  clientY,
  dragOffset,
  dragStatus,
  getDateByXY,
  getElementById,
  schedule,
  startOfView,
}: ResolveDraftDragScheduleInput): ResolvedDraftDragSchedule => {
  const sourceRow: DraftDragRow =
    schedule.kind === "allDay" ? "allDay" : "timed";
  const row = resolveDraftDragRow(clientY, sourceRow, getElementById);

  if (row === "timed") {
    const durationMin =
      sourceRow === "timed"
        ? getDragDurationMinutes(schedule, dragStatus)
        : CROSS_ROW_TIMED_DURATION_MIN;
    // Same-row timed drag keeps the grab offset; all-day → timed is absolute
    // (pointer marks the start), matching the saved-event cross-row ghost.
    const y = sourceRow === "timed" ? clientY - dragOffset.y : clientY;
    let eventStart = getDateByXY(clientX, y, startOfView);
    let eventEnd = eventStart.add(durationMin, "minutes");

    if (eventEnd.date() !== eventStart.date()) {
      eventEnd = eventEnd.hour(0).minute(0);
      eventStart = eventEnd.subtract(durationMin, "minutes");
    }

    return {
      durationMin,
      row,
      schedule: timedGridSchedule(eventStart.toDate(), eventEnd.toDate()),
    };
  }

  if (sourceRow === "allDay") {
    const durationMin = getDragDurationMinutes(schedule, dragStatus);
    const x = clientX - dragOffset.x;
    // Y is irrelevant for all-day day selection (mirrors all-day resize).
    const eventStart = getDateByXY(x, 0, startOfView).startOf("day");
    const eventEnd = eventStart.add(durationMin, "minutes");

    return {
      durationMin,
      row,
      schedule: {
        kind: "allDay",
        start: eventStart.toDate(),
        end: eventEnd.toDate(),
      },
    };
  }

  // Timed → all-day: collapse to a one-day all-day event on the drop column.
  const day = getDateByXY(clientX, 0, startOfView).startOf("day");
  return {
    durationMin: ONE_DAY_MINUTES,
    row,
    schedule: allDayGridSchedule(
      day.format(YEAR_MONTH_DAY_FORMAT),
      day.add(1, "day").format(YEAR_MONTH_DAY_FORMAT),
    ),
  };
};
