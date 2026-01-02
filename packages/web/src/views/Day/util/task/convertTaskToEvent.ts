import { ObjectId } from "bson";
import { Origin, Priorities } from "@core/constants/core.constants";
import { Schema_Event_Core } from "@core/types/event.types";
import dayjs, { Dayjs } from "@core/util/date/dayjs";
import { Task } from "@web/common/types/task.types";

export function convertTaskToEvent(
  task: Task,
  startTime: Dayjs,
  durationMinutes: number = 30,
  userId: string,
  isAllDay: boolean = false,
): Schema_Event_Core {
  const endTime = startTime.add(durationMinutes, "minute");

  return {
    _id: new ObjectId().toString(),
    title: task.title,
    description: task.description || "",
    startDate: startTime.toISOString(),
    endDate: endTime.toISOString(),
    isAllDay,
    isSomeday: false,
    user: userId,
    priority: Priorities.UNASSIGNED,
    origin: Origin.COMPASS,
  };
}
