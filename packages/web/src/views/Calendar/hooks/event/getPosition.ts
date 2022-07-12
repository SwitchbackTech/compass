import dayjs, { Dayjs } from "dayjs";
import { MS_IN_HR } from "@core/core.constants";
import {
  getAllDayEventWidth,
  getEventCategory,
  getLeftPosition,
} from "@web/common/utils/grid.util";
import { HOURS_AM_FORMAT } from "@web/common/constants/dates";
import { ACCEPTED_TIMES } from "@web/common/constants/web.constants";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import {
  DRAFT_PADDING_BOTTOM,
  EVENT_ALLDAY_HEIGHT,
} from "@web/common/constants/grid.constants";
import { GRID_MARGIN_LEFT } from "@web/views/Calendar/layout.constants";
import { Measurements_Grid } from "@web/views/Calendar/hooks/grid/useGridLayout";

export const getPosition = (
  event: Schema_GridEvent | null,
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

  let left = getLeftPosition(category, startIndex, colWidths);

  if (isDraft || !event.isAllDay) {
    left += GRID_MARGIN_LEFT;
  }

  let height: number;
  let top: number;
  let width: number;
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
    width = colWidths[startIndex];
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

  const position = { height, left, top, width };
  return position;
};

/*
export const getPositionOld = (
  event: Schema_GridEvent | null,
  startOfView: Dayjs,
  endOfView: Dayjs,
  measurements: Measurements_Grid,
  scrollTop: number,
  isDraft: boolean
) => {
  const { colWidths, mainGridRowHeight } = measurements;
  const start = dayjs(event.startDate);
  const end = dayjs(event.endDate);

  const category = getEventCategory(start, end, startOfView, endOfView);
  const startIndex = start.get("day");

  const left = getLeftPosition(category, startIndex, colWidths);

  let height: number;
  let top: number;
  let width: number;
  if (event.isAllDay) {
    height = 20;
    top = 25.26 * (event?.row || 1); // found by experimenting with what 'looked right'
    // absoluteTop = GRID_Y_START + 25.26 * (draft?.row || 1); //++
    width = getAllDayEventWidth(
      category,
      startIndex,
      start,
      end,
      startOfView,
      colWidths
    );
  } else {
    width = colWidths[startIndex];
    const widthBuffer = startIndex * (DIVIDER_GRID * 2);
    width -= widthBuffer;

    const startTime = ACCEPTED_TIMES.indexOf(start.format(HOURS_AM_FORMAT)) / 4;
    // top = mainGridRowHeight * startTime;
    // top = (655 / 11) * startTime;
    // top = 60.45 * startTime + 263;
    top = 60.45454545454545 * startTime;
    // console.log("top:", top);

    // console.log(mainGridRowHeight);
    // top = mainGridRowHeight * startTime + measurements.mainGrid.top - scrollTop;
    // top -= 70;
    // const allDayRect = document
    //   .querySelector(`#allDayRow`)
    //   .getBoundingClientRect();
    // // console.log(`
    //   ${mainGridRowHeight} * ${startTime}
    //     mainRowHeight * startTime
    //   ----
    //   ${top}
    //   -----
    //   scrollTop: ${scrollTop}
    //   mainGridTop: ${measurements.mainGrid.top}
    //   allDayRowBottom: ${measurements.allDayRow.bottom}
    //   actual-: ${allDayRect.bottom}
    // `);

    const duration = end.diff(start);
    const durationHours = duration * MS_IN_HR;
    height = mainGridRowHeight * durationHours;
    height -= DRAFT_PADDING_BOTTOM;
  }

  const position = { height, left, top, width };
  return position;
};
*/
