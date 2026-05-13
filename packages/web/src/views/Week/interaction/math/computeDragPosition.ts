import { Priorities } from "@core/constants/core.constants";
import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import dayjs, { type Dayjs } from "@core/util/date/dayjs";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import {
  type DragDurationStatus,
  getDragDurationMinutes,
} from "@web/views/Week/components/Draft/hooks/actions/drag-duration.util";
import { type DateCalcs } from "@web/views/Week/hooks/grid/useDateCalcs";

type DragPointer = {
  clientX: number;
  clientY: number;
};

type ComputeDragPositionParams = {
  dateCalcs: Pick<DateCalcs, "getDateByXY">;
  draft: Schema_GridEvent;
  dragStatus: DragDurationStatus | null;
  pointer: DragPointer;
  startOfView: Dayjs;
};

type ComputeDragHasMovedParams = {
  dateCalcs: Pick<DateCalcs, "getDateStrByXY">;
  draft: Schema_GridEvent | null;
  pointer: DragPointer;
  startOfView: Dayjs;
};

export const computeDragPosition = ({
  dateCalcs,
  draft,
  dragStatus,
  pointer,
  startOfView,
}: ComputeDragPositionParams): Schema_GridEvent | null => {
  const rawX = pointer.clientX;
  const x = draft.isAllDay ? rawX - draft.position.dragOffset.x : rawX;
  const startEndDurationMin = getDragDurationMinutes(draft, dragStatus);
  const y = pointer.clientY - draft.position.dragOffset.y;

  let eventStart = dateCalcs.getDateByXY(x, y, startOfView);
  let eventEnd = eventStart.add(startEndDurationMin, "minutes");

  if (!draft.isAllDay && eventEnd.date() !== eventStart.date()) {
    eventEnd = eventEnd.hour(0).minute(0);
    eventStart = eventEnd.subtract(startEndDurationMin, "minutes");
  }

  const nextStartDate = draft.isAllDay
    ? eventStart.format(YEAR_MONTH_DAY_FORMAT)
    : eventStart.format();
  const nextEndDate = draft.isAllDay
    ? eventEnd.format(YEAR_MONTH_DAY_FORMAT)
    : eventEnd.format();

  const isSameStart = draft.isAllDay
    ? draft.startDate === nextStartDate
    : dayjs(draft.startDate).isSame(nextStartDate);
  const isSameEnd = draft.isAllDay
    ? draft.endDate === nextEndDate
    : dayjs(draft.endDate).isSame(nextEndDate);

  if (isSameStart && isSameEnd) {
    return null;
  }

  return {
    ...draft,
    startDate: nextStartDate,
    endDate: nextEndDate,
    priority: draft.priority || Priorities.UNASSIGNED,
  };
};

export const computeDragHasMoved = ({
  dateCalcs,
  draft,
  pointer,
  startOfView,
}: ComputeDragHasMovedParams): boolean => {
  const currTime = dateCalcs.getDateStrByXY(
    pointer.clientX,
    pointer.clientY,
    startOfView,
  );

  return (
    draft !== null &&
    (draft.isAllDay
      ? currTime !== draft.startDate
      : !dayjs(draft.startDate).isSame(currTime))
  );
};
