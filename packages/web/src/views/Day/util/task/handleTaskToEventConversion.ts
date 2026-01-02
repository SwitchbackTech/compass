import { Active, Over } from "@dnd-kit/core";
import { Schema_Event_Core } from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
import { Task } from "@web/common/types/task.types";
import { getSnappedMinutes } from "@web/views/Day/util/agenda/agenda.util";
import { convertTaskToEvent } from "@web/views/Day/util/task/convertTaskToEvent";

export function handleTaskToEventConversion(
  task: Task,
  active: Active,
  over: Over,
  dateInView: dayjs.Dayjs,
  userId: string,
  isAllDay: boolean,
): Schema_Event_Core | null {
  let startTime: dayjs.Dayjs;

  if (isAllDay) {
    // For all-day events, use the start of the day
    startTime = dateInView.startOf("day");
  } else {
    // For timed events, snap to grid
    const snappedMinutes = getSnappedMinutes(active, over);
    if (snappedMinutes === null) return null;
    startTime = dateInView.startOf("day").add(snappedMinutes, "minute");
  }

  // Convert task to event (default duration is 30 minutes)
  const event = convertTaskToEvent(task, startTime, 30, userId, isAllDay);

  return event;
}
