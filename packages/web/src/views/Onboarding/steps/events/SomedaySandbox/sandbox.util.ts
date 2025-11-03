import { ObjectId } from "bson";
import { Origin, Priorities } from "@core/constants/core.constants";
import { Schema_Event } from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
import { getUserId } from "@web/auth/auth.util";
import { colorByPriority } from "@web/common/styles/theme.util";
import { Categories_Event } from "@web/common/types/web.event.types";
import { getDatesByCategory } from "@web/common/utils/datetime/web.date.util";
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
  const weekEvents: Schema_Event[] = [];
  for (let i = 0; i < weekTasks.length; i++) {
    const event = await createEventFromTask(
      weekTasks[i],
      Categories_Event.SOMEDAY_WEEK,
      i,
    );
    weekEvents.push(event);
  }

  // Create events from month tasks
  const monthEvents: Schema_Event[] = [];
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
): Promise<Schema_Event> {
  const userId = await getUserId();
  const now = dayjs();

  const weekStart = now.startOf("week");
  const weekEnd = now.endOf("week");
  const { startDate, endDate } = getDatesByCategory(
    category,
    weekStart,
    weekEnd,
  );

  return {
    _id: new ObjectId().toString(),
    title: task.text,
    description: "",
    startDate,
    endDate,
    user: userId,
    isAllDay: false,
    isSomeday: true,
    origin: Origin.COMPASS,
    order,
    priority: getPriorityFromColor(task.color),
  };
};
