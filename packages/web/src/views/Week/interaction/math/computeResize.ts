import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import dayjs, { type Dayjs } from "@core/util/date/dayjs";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { GRID_TIME_STEP } from "@web/views/Week/layout.constants";

type ResizeDateKey = "startDate" | "endDate";

type ResizeDraftDates = {
  endDate?: string;
  startDate?: string;
};

type ComputeResizeParams = {
  currTime: Dayjs;
  dateBeingChanged: ResizeDateKey | null;
  draft: Schema_GridEvent;
  reduxDraft: ResizeDraftDates;
};

type ResizeFlipDraft = {
  endDate: string;
  hasFlipped: boolean;
  priority: Schema_GridEvent["priority"];
  startDate: string;
};

export type ComputeResizeResult = {
  dateChanged: ResizeDateKey;
  flipDraft: ResizeFlipDraft;
  hasMoved: boolean;
  nextDateBeingChanged: ResizeDateKey;
  updatedTime: string;
};

const isValidResizeMovement = (
  currTime: Dayjs,
  dateBeingChanged: ResizeDateKey | null,
  draft: Schema_GridEvent,
): dateBeingChanged is ResizeDateKey => {
  if (!dateBeingChanged) return false;

  if (draft.isAllDay) {
    return true;
  }

  const currTimeFormatted = currTime.format();
  const noChange = draft[dateBeingChanged] === currTimeFormatted;

  if (noChange) return false;

  const diffDay = currTime.day() !== dayjs(draft.startDate).day();
  if (diffDay) return false;

  const sameStart = currTime.format() === draft.startDate;
  if (sameStart) return false;

  return true;
};

const computeResizeFlip = (
  currTime: Dayjs,
  dateBeingChanged: ResizeDateKey,
  draft: Schema_GridEvent,
) => {
  const oppositeKey: ResizeDateKey =
    dateBeingChanged === "startDate" ? "endDate" : "startDate";
  let startDate = draft.startDate;
  let endDate = draft.endDate;
  let hasFlipped = false;
  let nextDateBeingChanged: ResizeDateKey = dateBeingChanged;
  const opposite = dayjs(draft[oppositeKey]);
  const comparisonKeyword =
    dateBeingChanged === "startDate" ? "after" : "before";

  if (comparisonKeyword === "after" && currTime.isAfter(opposite)) {
    nextDateBeingChanged = oppositeKey;
    startDate = draft.endDate;
    hasFlipped = true;
  } else if (comparisonKeyword === "before" && currTime.isBefore(opposite)) {
    nextDateBeingChanged = oppositeKey;
    if (draft.isAllDay) {
      startDate = dayjs(startDate)
        .subtract(1, "day")
        .format(YEAR_MONTH_DAY_FORMAT);
      endDate = dayjs(startDate).add(1, "day").format(YEAR_MONTH_DAY_FORMAT);
    } else {
      startDate = dayjs(startDate).subtract(GRID_TIME_STEP, "minutes").format();
      endDate = dayjs(startDate).add(GRID_TIME_STEP, "minutes").format();
    }
    hasFlipped = true;
  }

  return {
    flipDraft: {
      endDate,
      hasFlipped,
      priority: draft.priority,
      startDate,
    },
    hasFlipped,
    nextDateBeingChanged,
    oppositeKey,
  };
};

export const computeResize = ({
  currTime,
  dateBeingChanged,
  draft,
  reduxDraft,
}: ComputeResizeParams): ComputeResizeResult | null => {
  if (!isValidResizeMovement(currTime, dateBeingChanged, draft)) {
    return null;
  }

  const resizeFlip = computeResizeFlip(currTime, dateBeingChanged, draft);
  const dateChanged: ResizeDateKey = resizeFlip.hasFlipped
    ? resizeFlip.oppositeKey
    : dateBeingChanged;
  const origTime = dayjs(reduxDraft[dateChanged]).add(-1, "day");

  let updatedTime: string;
  let hasMoved: boolean;

  if (draft.isAllDay) {
    const diffDays = currTime.diff(origTime, "day", true);
    updatedTime = currTime
      .add(dateChanged === "endDate" ? 1 : 0, "day")
      .format(YEAR_MONTH_DAY_FORMAT);
    hasMoved = diffDays !== 0;
  } else {
    const diffMin = currTime.diff(origTime, "minute");
    updatedTime = origTime.add(diffMin, "minutes").format();
    hasMoved = diffMin !== 0;
  }

  return {
    dateChanged,
    flipDraft: resizeFlip.flipDraft,
    hasMoved,
    nextDateBeingChanged: resizeFlip.nextDateBeingChanged,
    updatedTime,
  };
};
