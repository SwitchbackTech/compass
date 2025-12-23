import { Active, Over } from "@dnd-kit/core";
import { Schema_Event } from "@core/types/event.types";
import { Dayjs } from "@core/util/date/dayjs";
import { ID_GRID_MAIN } from "@web/common/constants/web.constants";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import {
  MINUTES_PER_SLOT,
  SLOT_HEIGHT,
} from "@web/views/Day/constants/day.constants";

export const getAgendaEventTitle = (event: Schema_Event) =>
  `${event.title}\n${getAgendaEventTime(event.startDate as string)} - ${getAgendaEventTime(event.endDate as string)}`;

export const getAgendaEventTime = (date: Date | string) => {
  const dateObj = date instanceof Date ? date : new Date(date);
  const hours = dateObj.getHours();
  const minutes = dateObj.getMinutes();
  const ampm = hours >= 12 ? "pm" : "am";
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHours}:${minutes.toString().padStart(2, "0")}${ampm}`;
};

// Get position in pixels for a given time (15-minute slots, 20px each)
export const getAgendaEventPosition = (date: Date) => {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const slot = hours * 4 + Math.floor(minutes / MINUTES_PER_SLOT);
  return slot * SLOT_HEIGHT;
};

// Get exact position in pixels for the now line (accounts for fractional minutes)
export const getNowLinePosition = (date: Date) => {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  return (hours * 4 + minutes / MINUTES_PER_SLOT) * SLOT_HEIGHT;
};

// Get time (Date) from Y position on the agenda grid,
// snapped to 15-minute slots
export const getEventTimeFromPosition = (
  yPosition: number,
  dateInView: Dayjs,
): Dayjs => {
  const mainGrid = document.getElementById(ID_GRID_MAIN);
  const mainGridRect = mainGrid?.getBoundingClientRect();
  const gridTop = mainGridRect?.top ?? 0;
  const offset = yPosition - gridTop;

  // Calculate which slot the position corresponds to
  const slot = Math.floor(offset / SLOT_HEIGHT);
  const hours = Math.floor(slot / 4);
  const minutes = (slot % 4) * MINUTES_PER_SLOT;

  // Clamp hours to valid range (0-23)
  const clampedHours = Math.max(0, Math.min(23, hours));
  const clampedMinutes =
    hours > 23
      ? 45
      : clampedHours === 23
        ? Math.min(45, minutes)
        : Math.max(0, minutes);

  return dateInView.startOf("day").hour(clampedHours).minute(clampedMinutes);
};

export const getSnappedMinutes = (active: Active, over: Over) => {
  const activeRect = active.rect.current.translated;
  const overRect = over.rect;

  if (!activeRect || !overRect) return null;

  const relativeY = activeRect.top - overRect.top;
  const gridHeight = overRect.height;
  const minutesFromMidnight = (relativeY / gridHeight) * 24 * 60;
  const timeSlots = Math.round(minutesFromMidnight / MINUTES_PER_SLOT);
  const adjustedMinsFromMidnight = timeSlots * MINUTES_PER_SLOT;
  const snappedMinutes = Math.max(0, Math.min(1439, adjustedMinsFromMidnight));

  return snappedMinutes;
};

export const roundMinutesToNearestFifteen = (minutes: number) => {
  return Math.round(minutes / 15) * 15;
};

/**
 * roundToNearestFifteenWithinHour
 * between 0 and 45 minutes, rounds to the nearest 15-minute increment
 */
export const roundToNearestFifteenWithinHour = (minutes: number) => {
  return Math.min(45, roundMinutesToNearestFifteen(minutes));
};

export const getEventHeight = (
  event: Pick<Schema_GridEvent, "startDate" | "endDate">,
) => {
  const startDate = new Date(event.startDate);
  const endDate = new Date(event.endDate);
  const startPosition = getAgendaEventPosition(startDate);
  const endPosition = getAgendaEventPosition(endDate);
  const blockHeight = endPosition - startPosition;
  const GAP_PX = 2;
  const renderedHeight = Math.max(4, blockHeight - GAP_PX);

  return renderedHeight;
};
