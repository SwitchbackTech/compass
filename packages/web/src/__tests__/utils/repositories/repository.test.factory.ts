import { Origin, Priorities } from "@core/constants/core.constants";
import { Event_Core } from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
import { createMockStandaloneEvent } from "@core/util/test/ccal.event.factory";
import { Task } from "@web/common/types/task.types";

/**
 * Factory function to create a test Event_Core with sensible defaults.
 * @param overrides - Partial event properties to override defaults
 * @returns A complete Event_Core object
 */
export const createTestEvent = (
  overrides: Partial<Event_Core & { order?: number }> = {},
): Event_Core & { order?: number } => {
  const dateStr = dayjs().format(dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT);
  return {
    _id: `event-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
    title: "Test Event",
    startDate: dateStr,
    endDate: dateStr,
    origin: Origin.COMPASS,
    priority: Priorities.UNASSIGNED,
    user: "user-1",
    ...overrides,
  };
};

/**
 * Factory function to create a test CompassCoreEvent (for edit operations).
 * Uses the existing factory from @core/util/test/ccal.event.factory.
 * @param overrides - Partial event properties to override defaults
 * @returns A complete event object compatible with CompassCoreEvent
 */
export const createTestCompassEvent = (
  overrides: Parameters<typeof createMockStandaloneEvent>[0] = {},
) => {
  return createMockStandaloneEvent(overrides);
};

/**
 * Factory function to create a test Task with sensible defaults.
 * @param overrides - Partial task properties to override defaults
 * @returns A complete Task object
 */
export const createTestTask = (overrides: Partial<Task> = {}): Task => {
  return {
    id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
    title: "Test Task",
    status: "todo",
    order: 0,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
};

/**
 * Factory function to create multiple test tasks.
 * @param count - Number of tasks to create
 * @param overrides - Partial task properties to override defaults (applied to all tasks)
 * @returns Array of Task objects
 */
export const createTestTasks = (
  count: number,
  overrides: Partial<Task> = {},
): Task[] => {
  return Array.from({ length: count }, (_, index) =>
    createTestTask({
      ...overrides,
      id: overrides.id || `task-${index + 1}`,
      title: overrides.title || `Task ${index + 1}`,
      order: overrides.order !== undefined ? overrides.order : index,
    }),
  );
};
