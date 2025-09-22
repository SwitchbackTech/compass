import dayjs from "dayjs";
import { Origin, Priorities } from "@core/constants/core.constants";
import {
  Categories_Event,
  CompassCoreEvent,
  Schema_Event,
  Schema_Event_Core,
} from "@core/types/event.types";
import { getUserId } from "@web/auth/auth.util";
import { colorByPriority } from "@web/common/styles/theme.util";
import { getDatesByCategory } from "@web/common/utils/web.date.util";
import { EventApi } from "@web/ducks/events/event.api";

// Helper function to map task color to priority
const getPriorityFromColor = (color: string): Priorities => {
  if (color === colorByPriority.work) return Priorities.WORK;
  if (color === colorByPriority.self) return Priorities.SELF;
  if (color === colorByPriority.relationships) return Priorities.RELATIONS;
  return Priorities.UNASSIGNED;
};

// Function to create and submit events to the backend
export const createAndSubmitEvents = async (
  weekTasks: { text: string; color: string }[],
  monthTasks: { text: string; color: string }[],
): Promise<void> => {
  // Create events from week tasks
  const weekEvents: CompassCoreEvent[] = [];
  for (let i = 0; i < weekTasks.length; i++) {
    const event = await createEventFromTask(
      weekTasks[i],
      Categories_Event.SOMEDAY_WEEK,
      i,
    );
    weekEvents.push(event);
  }

  // Create events from month tasks
  const monthEvents: CompassCoreEvent[] = [];
  for (let i = 0; i < monthTasks.length; i++) {
    const event = await createEventFromTask(
      monthTasks[i],
      Categories_Event.SOMEDAY_MONTH,
      i,
    );
    monthEvents.push(event);
  }

  // Submit all events to the backend
  const allEvents = [...weekEvents, ...monthEvents];

  // Create events one by one using the API
  await EventApi.create(allEvents);
};

const createEventFromTask = async function (
  task: { text: string; color: string },
  category: Categories_Event.SOMEDAY_WEEK | Categories_Event.SOMEDAY_MONTH,
  order: number,
): Promise<CompassCoreEvent> {
  const userId = await getUserId();
  const now = dayjs();

  const weekStart = now.startOf("week");
  const weekEnd = now.endOf("week");
  const { startDate, endDate } = getDatesByCategory(
    category,
    weekStart,
    weekEnd,
  );

  //@ts-expect-error - not supporting FE-generated _ids yet
  return {
    title: task.text,
    description: "",
    startDate,
    endDate,
    user: userId,
    isAllDay: false,
    isSomeday: true,
    origin: Origin.COMPASS,
    priority: getPriorityFromColor(task.color),
  };
};
