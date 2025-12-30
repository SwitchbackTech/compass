import { ObjectId } from "bson";
import { Origin, Priorities } from "@core/constants/core.constants";
import { Schema_Event_Regular } from "@core/types/event.types";
import dayjs, { Dayjs } from "@core/util/date/dayjs";
import { Task } from "@web/common/types/task.types";

/**
 * Converts a task to an event
 * @param task - The task to convert
 * @param startTime - The start time for the event (should be snapped to the grid)
 * @param durationMinutes - The duration of the event in minutes (default: 15)
 * @param userId - The user ID
 * @returns A new regular event schema (non-recurring)
 */
export function convertTaskToEvent(
  task: Task,
  startTime: Dayjs,
  durationMinutes: number = 15,
  userId: string,
): Schema_Event_Regular {
  const endTime = startTime.add(durationMinutes, "minute");

  return {
    _id: new ObjectId().toString(),
    title: task.title,
    description: task.description || "",
    startDate: startTime.toISOString(),
    endDate: endTime.toISOString(),
    isAllDay: false,
    isSomeday: false,
    user: userId,
    priority: Priorities.UNASSIGNED,
    origin: Origin.COMPASS,
  };
}
