import dayjs, { Dayjs } from "dayjs";
import { MS_IN_HR } from "@core/constants/core.constants";
import { HOURS_AM_FORMAT } from "@core/constants/date.constants";
import {
  getAllDayEventWidth,
  getEventCategory,
  getLeftPosition,
} from "@web/common/utils/grid.util";
import { ACCEPTED_TIMES } from "@web/common/constants/web.constants";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import {
  DRAFT_PADDING_BOTTOM,
  EVENT_ALLDAY_HEIGHT,
} from "@web/views/Calendar/layout.constants";
import { GRID_MARGIN_LEFT } from "@web/views/Calendar/layout.constants";
import { Measurements_Grid } from "@web/views/Calendar/hooks/grid/useGridLayout";

export const getPosition = (
  event: Schema_GridEvent,
  startOfView: Dayjs,
  endOfView: Dayjs,
  measurements: Measurements_Grid,
  isDraft: boolean
) => {
  const { colWidths } = measurements;
  const start = dayjs(event.startDate);
  const end = dayjs(event.endDate);

  const category = getEventCategory(start, end, startOfView, endOfView);
  const startIndex = start.get("day");

  let height: number;
  let top: number;
  let width: number;
  let left: number;

  if (event.isAllDay) {
    height = EVENT_ALLDAY_HEIGHT;
    top = 23 * (event?.row || 1); // found by experimenting with what 'looked right'
    width = getAllDayEventWidth(
      category,
      startIndex,
      start,
      end,
      startOfView,
      colWidths
    );
  } else {
    width = isDraft
      ? // If we are drafting an event, we want the event to be full width of the column
        colWidths[startIndex]
      : // Else, we want the width to be whatever the event's width multiplier is
        colWidths[startIndex] * event.position.widthMultiplier;

    const widthBuffer = 11;
    width -= widthBuffer;

    const startTime = ACCEPTED_TIMES.indexOf(start.format(HOURS_AM_FORMAT)) / 4;

    const hourHeight = measurements.hourHeight;
    top = hourHeight * startTime;

    const duration = end.diff(start);
    const durationHours = duration * MS_IN_HR;
    height = hourHeight * durationHours;
    height -= DRAFT_PADDING_BOTTOM;
  }

  left = getLeftPosition(
    category,
    startIndex,
    colWidths,
    event,
    width,
    isDraft
  );

  if (isDraft || !event.isAllDay) {
    left += GRID_MARGIN_LEFT;
  }

  const position = { height, left, top, width };
  return position;
};
