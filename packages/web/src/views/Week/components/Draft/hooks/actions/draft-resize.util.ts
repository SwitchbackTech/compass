import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import dayjs, { type Dayjs } from "@core/util/date/dayjs";
import {
  type GridEventDraft,
  type GridScheduleDraft,
} from "@web/events/event-draft.types";
import { replaceGridDraftSchedule } from "@web/events/grid-event-draft.adapter";
import { GRID_TIME_STEP } from "@web/grid/grid.constants";

type DateKey = "startDate" | "endDate";

type DraftDates = Record<DateKey, string>;

const formatDraftDate = (date: Date, isAllDay: boolean) =>
  isAllDay ? dayjs(date).format(YEAR_MONTH_DAY_FORMAT) : dayjs(date).format();

const datesFor = (draft: GridEventDraft, isAllDay: boolean): DraftDates => ({
  startDate: formatDraftDate(draft.values.schedule.start, isAllDay),
  endDate: formatDraftDate(draft.values.schedule.end, isAllDay),
});

export function isValidDraftResize(
  currTime: Dayjs,
  draft: GridEventDraft,
  dateBeingChanged: DateKey,
): boolean {
  if (draft.values.schedule.kind === "allDay") return true;

  const draftDate =
    dateBeingChanged === "startDate"
      ? draft.values.schedule.start
      : draft.values.schedule.end;
  const formattedCurrentTime = currTime.format();
  if (dayjs(draftDate).format() === formattedCurrentTime) return false;

  const diffDay = currTime.day() !== dayjs(draft.values.schedule.start).day();
  if (diffDay) return false;

  return formattedCurrentTime !== dayjs(draft.values.schedule.start).format();
}

export function resizeDraft({
  currTime,
  dateBeingChanged,
  draft,
  origin,
}: {
  currTime: Dayjs;
  dateBeingChanged: DateKey;
  draft: GridEventDraft;
  origin: GridEventDraft;
}): {
  draft: GridEventDraft;
  flippedTo: DateKey | null;
  hasMoved: boolean;
} | null {
  if (!isValidDraftResize(currTime, draft, dateBeingChanged)) return null;

  const isAllDay = draft.values.schedule.kind === "allDay";
  const oppositeKey =
    dateBeingChanged === "startDate" ? "endDate" : "startDate";
  const draftDates = datesFor(draft, isAllDay);
  const originDates = datesFor(origin, isAllDay);
  let startDate = draftDates.startDate;
  let endDate = draftDates.endDate;
  let changedDate = dateBeingChanged;
  let flippedTo: DateKey | null = null;

  if (
    dateBeingChanged === "startDate" &&
    currTime.isAfter(dayjs(draftDates[oppositeKey]))
  ) {
    changedDate = oppositeKey;
    startDate = draftDates.endDate;
    flippedTo = changedDate;
  } else if (
    dateBeingChanged === "endDate" &&
    currTime.isBefore(dayjs(draftDates[oppositeKey]))
  ) {
    changedDate = oppositeKey;
    if (isAllDay) {
      startDate = dayjs(startDate)
        .subtract(1, "day")
        .format(YEAR_MONTH_DAY_FORMAT);
      endDate = dayjs(startDate).add(1, "day").format(YEAR_MONTH_DAY_FORMAT);
    } else {
      startDate = dayjs(startDate).subtract(GRID_TIME_STEP, "minutes").format();
      endDate = dayjs(startDate).add(GRID_TIME_STEP, "minutes").format();
    }
    flippedTo = changedDate;
  }

  const workingSchedule: GridScheduleDraft = isAllDay
    ? {
        kind: "allDay",
        start: dayjs(startDate).toDate(),
        end: dayjs(endDate).toDate(),
      }
    : {
        ...draft.values.schedule,
        start: dayjs(startDate).toDate(),
        end: dayjs(endDate).toDate(),
      };
  const workingDraft = replaceGridDraftSchedule(draft, workingSchedule);
  const originTime = dayjs(originDates[changedDate]).subtract(1, "day");
  const hasMoved = isAllDay
    ? currTime.diff(originTime, "day", true) !== 0
    : currTime.diff(originTime, "minute") !== 0;
  const updatedTime = isAllDay
    ? currTime
        .add(changedDate === "endDate" ? 1 : 0, "day")
        .format(YEAR_MONTH_DAY_FORMAT)
    : originTime.add(currTime.diff(originTime, "minute"), "minutes").format();
  const schedule: GridScheduleDraft = {
    ...workingDraft.values.schedule,
    ...(changedDate === "startDate"
      ? { start: dayjs(updatedTime).toDate() }
      : { end: dayjs(updatedTime).toDate() }),
  } as GridScheduleDraft;

  return {
    draft: replaceGridDraftSchedule(workingDraft, schedule),
    flippedTo,
    hasMoved,
  };
}
