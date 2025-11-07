import { Schema_Event } from "@core/types/event.types";
import { MINUTES_PER_SLOT, SLOT_HEIGHT } from "../../constants/day.constants";

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
