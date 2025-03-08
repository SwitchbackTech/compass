import dayjs, { Dayjs } from "dayjs";
import dayOfYear from "dayjs/plugin/dayOfYear";
import isBetween from "dayjs/plugin/isBetween";
import weekPlugin from "dayjs/plugin/weekOfYear";
import { MS_IN_HR } from "@core/constants/core.constants";
import { HOURS_AM_FORMAT } from "@core/constants/date.constants";
import { Category } from "@web/ducks/events/event.types";
import { Measurements_Grid } from "@web/views/Calendar/hooks/grid/useGridLayout";
import {
  DRAFT_PADDING_BOTTOM,
  EVENT_ALLDAY_HEIGHT,
  EVENT_PADDING_RIGHT,
  GRID_MARGIN_LEFT,
} from "@web/views/Calendar/layout.constants";
import { ACCEPTED_TIMES } from "../constants/web.constants";
import { Schema_GridEvent } from "../types/web.event.types";

dayjs.extend(dayOfYear);
dayjs.extend(weekPlugin);
dayjs.extend(isBetween);

export const getAbsoluteLeftPosition = (
  category: Category,
  startIndex: number,
  colWidths: number[],
  event?: Schema_GridEvent,
  eventWidth?: number,
  isDraft?: boolean,
) => {
  let positionStart: number;

  switch (category) {
    case Category.PastToThisWeek:
    case Category.PastToFutureWeek: {
      positionStart = 0;
      break;
    }
    case Category.ThisWeekOnly:
    case Category.ThisToFutureWeek:
      {
        // add up from 0 index to startIndex
        positionStart = colWidths.reduce((accum, width, index) => {
          return index < startIndex ? accum + width : accum;
        }, 0);

        if (!event || !eventWidth) {
          return positionStart;
        }

        if (
          !isDraft &&
          !event.isAllDay &&
          event.position.isOverlapping &&
          event.position.horizontalOrder > 1
        ) {
          positionStart += eventWidth * (event.position.horizontalOrder - 1);
        }
      }
      break;
    default: {
      console.error("Logic error while parsing left position of date");
      positionStart = -666;
    }
  }

  return positionStart;
};

export const getAllDayEventWidth = (
  category: Category,
  startIndex: number,
  start: Dayjs,
  end: Dayjs,
  startOfWeek: Dayjs,
  widths: number[],
) => {
  let width: number;

  switch (category) {
    case Category.ThisWeekOnly: {
      let duration = end.diff(start, "days");
      if (duration === 0) {
        // if only one day, then use original width
        width = widths[startIndex];
        duration = 1; // prevents width from being 0
      }
      width = _sumEventWidths(duration, startIndex, widths);
      break;
    }
    case Category.ThisToFutureWeek: {
      width = _sumEventWidths(7 - startIndex, startIndex, widths);
      break;
    }
    case Category.PastToThisWeek: {
      const daysThisWeek = end.diff(startOfWeek, "days");
      // start at 0 because event carries over from last week
      width = _sumEventWidths(daysThisWeek, 0, widths);
      break;
    }
    case Category.PastToFutureWeek: {
      width = _sumEventWidths(7, 0, widths);
      break;
    }
    default: {
      console.error("Logic error while parsing date width");
      width = -666;
    }
  }

  return widthMinusPadding(width);
};

export const getEventCategory = (
  start: Dayjs,
  end: Dayjs,
  startOfWeek: Dayjs,
  endOfWeek: Dayjs,
): Category => {
  const startsThisWeek = start.isBetween(startOfWeek, endOfWeek, "day", "[]");
  const endsThisWeek = end.isBetween(startOfWeek, endOfWeek, "day", "[]");

  if (startsThisWeek && endsThisWeek) {
    return Category.ThisWeekOnly;
  }
  if (startsThisWeek && !endsThisWeek) {
    return Category.ThisToFutureWeek;
  }
  if (!startsThisWeek && endsThisWeek) {
    return Category.PastToThisWeek;
  }
  if (!startsThisWeek && !endsThisWeek) {
    return Category.PastToFutureWeek;
  }

  console.error("Logic error while getting event category");
  return Category.ThisWeekOnly;
};

export const getAllDayEventPosition = (
  event: Schema_GridEvent,
  startOfView: Dayjs,
  endOfView: Dayjs,
  measurements: Measurements_Grid,
  isDraft: boolean,
) => {
  const { colWidths } = measurements;
  const start = dayjs(event.startDate);
  const end = dayjs(event.endDate);

  const category = getEventCategory(start, end, startOfView, endOfView);
  const startIndex = start.get("day");

  const height = EVENT_ALLDAY_HEIGHT;
  const top = 23 * (event?.row || 1); // found by experimenting with what 'looked right'
  const width = getAllDayEventWidth(
    category,
    startIndex,
    start,
    end,
    startOfView,
    colWidths,
  );

  const left = getLeftPosition(
    category,
    startIndex,
    colWidths,
    event,
    width,
    isDraft,
  );

  const position = { height, left, top, width };
  return position;
};

export const getTimedEventPosition = (
  event: Schema_GridEvent,
  startOfView: Dayjs,
  endOfView: Dayjs,
  measurements: Measurements_Grid,
  isDraft: boolean,
) => {
  const { colWidths } = measurements;
  const start = dayjs(event.startDate);
  const end = dayjs(event.endDate);

  const category = getEventCategory(start, end, startOfView, endOfView);
  const startIndex = start.get("day");

  const width = getTimedEventWidth(
    colWidths,
    startIndex,
    event.position.widthMultiplier,
    isDraft,
  );
  const startTime = ACCEPTED_TIMES.indexOf(start.format(HOURS_AM_FORMAT)) / 4;

  const hourHeight = measurements.hourHeight;
  const top = hourHeight * startTime;

  const duration = end.diff(start);
  const durationHours = duration * MS_IN_HR;
  let height = hourHeight * durationHours;
  height -= DRAFT_PADDING_BOTTOM;

  const left = getLeftPosition(
    category,
    startIndex,
    colWidths,
    event,
    width,
    isDraft,
  );

  const position = { height, left, top, width };
  return position;
};

export const getEventPosition = (
  event: Schema_GridEvent,
  startOfView: Dayjs,
  endOfView: Dayjs,
  measurements: Measurements_Grid,
  isDraft: boolean,
) => {
  if (event.isAllDay) {
    return getAllDayEventPosition(
      event,
      startOfView,
      endOfView,
      measurements,
      isDraft,
    );
  }
  return getTimedEventPosition(
    event,
    startOfView,
    endOfView,
    measurements,
    isDraft,
  );
};

const getRelativeLeftPosition = (
  initialLeft: number,
  event?: Schema_GridEvent,
  isDraft?: boolean,
) => {
  let adjustment = 0;
  const GRID_EVENT_OVERLAPPING_HORIZONTAL_MARGIN = 4;

  if (!isDraft && event?.position?.isOverlapping) {
    const isNotFirstInRow = event.position.horizontalOrder !== 1;
    if (isNotFirstInRow) {
      adjustment +=
        GRID_EVENT_OVERLAPPING_HORIZONTAL_MARGIN *
        (event.position.horizontalOrder - 1);
    }
  }

  const isTimedEvent = event?.isAllDay === false;
  if (isTimedEvent) {
    adjustment += GRID_MARGIN_LEFT;
  }

  const relativeLeft = initialLeft + adjustment;
  return relativeLeft;
};

export const getTimedEventWidth = (
  colWidths: number[],
  startIndex: number,
  widthMultiplier: number,
  isDraft: boolean,
) => {
  let width = isDraft
    ? // If we are drafting an event, we want the event to be full width of the column
      colWidths[startIndex]
    : // Else, we want the width to be whatever the event's width multiplier is
      colWidths[startIndex] * widthMultiplier;

  const BUFFER_WIDTH = 11;
  width -= BUFFER_WIDTH;
  return width;
};

export const getLeftPosition = (
  category: Category,
  startIndex: number,
  colWidths: number[],
  event?: Schema_GridEvent,
  eventWidth?: number,
  isDraft?: boolean,
) => {
  let left = getAbsoluteLeftPosition(
    category,
    startIndex,
    colWidths,
    event,
    eventWidth,
    isDraft,
  );

  left = getRelativeLeftPosition(left, event, isDraft);

  return left;
};

export const widthMinusPadding = (width: number) => {
  const adjustedWidth = width - EVENT_PADDING_RIGHT;

  if (adjustedWidth < 0) {
    return width;
  }
  return adjustedWidth;
};

const _sumEventWidths = (
  duration: number,
  startIndex: number,
  widths: number[],
) => {
  // create array of numbers, one for each day, setting each to 0 by default,
  // then set values based on the widths of the days of the event
  const eventWidths: number[] = Array(duration || 0)
    .fill(0)
    .map((_, index) => widths[index + startIndex] || 0);

  // add up width of each day of the event
  const eventWidth = eventWidths.reduce((accum, value) => accum + value, 0);
  return eventWidth;
};
