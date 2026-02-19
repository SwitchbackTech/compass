import { Origin, Priorities } from "@core/constants/core.constants";
import { Event_Core } from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
import { UNAUTHENTICATED_USER } from "@web/common/constants/auth.constants";
import { Task } from "@web/common/types/task.types";
import { createObjectIdString } from "@web/common/utils/id/object-id.util";
import { StorageAdapter } from "../../adapter/storage.adapter";
import { ExternalMigration } from "../migration.types";

/**
 * Creates a demo event with sensible defaults.
 */
function createEvent(
  overrides: Partial<Event_Core> & Pick<Event_Core, "startDate" | "endDate">,
): Event_Core {
  return {
    _id: createObjectIdString(),
    origin: Origin.COMPASS,
    priority: Priorities.UNASSIGNED,
    user: UNAUTHENTICATED_USER,
    ...overrides,
  };
}

/**
 * Creates a demo task with sensible defaults.
 */
function createTask(overrides: Partial<Task> & Pick<Task, "title">): Task {
  return {
    _id: createObjectIdString(),
    status: "todo",
    order: 0,
    createdAt: dayjs().toISOString(),
    user: UNAUTHENTICATED_USER,
    ...overrides,
  };
}

/**
 * Generate demo data relative to the current date.
 */
function generateDemoData() {
  const now = dayjs();
  const today = now.toYearMonthDayString();
  const yesterday = now.subtract(1, "day").toYearMonthDayString();
  const tomorrow = now.add(1, "day").toYearMonthDayString();
  const { week, month } = now.weekMonthRange();

  // Helper for creating timed events today
  const todayAt = (h: number, m = 0) =>
    now.hour(h).minute(m).second(0).toRFC3339OffsetString();

  // ─── Someday Events ─────────────────────────────────────────────────────────
  const somedayEvents: Event_Core[] = [
    // Someday Week
    createEvent({
      title: "Learn a new keyboard shortcut",
      description: "Press `w` to create a new someday week event",
      startDate: week.startDate,
      endDate: week.endDate,
      isSomeday: true,
    }),
    // Someday Month
    createEvent({
      title: "Review quarterly goals",
      description: "Press `m` to create a new someday month event",
      startDate: month.startDate,
      endDate: month.endDate,
      isSomeday: true,
    }),
  ];

  // ─── Regular Events (Today) ─────────────────────────────────────────────────
  const todayEvents: Event_Core[] = [
    createEvent({
      title: "Morning standup",
      startDate: todayAt(9, 0),
      endDate: todayAt(9, 30),
      priority: Priorities.WORK,
    }),
    createEvent({
      title: "Try Compass",
      description:
        "Welcome! Explore the calendar and tasks. When ready to bring in Google events, select 'Connect Google Calendar' from the cmd palette (Cmd+K)",
      startDate: todayAt(10, 0),
      endDate: todayAt(11, 0),
      priority: Priorities.UNASSIGNED,
    }),
    createEvent({
      title: "Exercise",
      startDate: todayAt(12, 0),
      endDate: todayAt(13, 0),
      priority: Priorities.SELF,
    }),
    createEvent({
      title: "Catch up with a friend",
      startDate: todayAt(17, 0),
      endDate: todayAt(18, 0),
      priority: Priorities.RELATIONS,
    }),
  ];

  // ─── Tasks (Today) ──────────────────────────────────────────────────────────
  const todayTasks: Task[] = [
    createTask({
      title: "Star the repo",
      description: "https://github.com/SwitchbackTech/compass",
      order: 0,
    }),
    createTask({
      title: "Open cmd palette (Cmd+K)",
      order: 1,
    }),
    createTask({
      title: "Migrate this forward",
      order: 2,
    }),
    createTask({
      title: "Migrate this backward",
      order: 3,
    }),
  ];

  // ─── Tasks (Yesterday) - Completed ──────────────────────────────────────────
  const yesterdayTasks: Task[] = [
    createTask({
      title: "Set up development environment",
      status: "completed",
      order: 0,
    }),
    createTask({
      title: "Read project documentation",
      status: "completed",
      order: 1,
    }),
    createTask({
      title: "Configure IDE",
      status: "completed",
      order: 2,
    }),
  ];

  // ─── Tasks (Tomorrow) ───────────────────────────────────────────────────────
  const tomorrowTasks: Task[] = [
    createTask({
      title: "Create daily plan",
      order: 0,
    }),
  ];

  return {
    events: [...somedayEvents, ...todayEvents],
    tasks: {
      [today]: todayTasks,
      [yesterday]: yesterdayTasks,
      [tomorrow]: tomorrowTasks,
    },
  };
}

/**
 * Seeds demo data for first-time users.
 *
 * This migration checks if the user has any existing events or tasks.
 * If storage is empty (first-time user), it populates the app with
 * sample data so they can immediately explore functionality.
 *
 * Demo data includes:
 * - 4 today events with different priorities (work, self, relationships, unassigned)
 * - 2 someday events (week and month)
 * - 4 today tasks
 * - 3 completed yesterday tasks
 * - 1 tomorrow task
 */
export const demoDataSeedMigration: ExternalMigration = {
  id: "demo-data-seed-v1",
  description: "Seed demo data for first-time users",

  async migrate(adapter: StorageAdapter): Promise<void> {
    // Check if user already has data
    const existingEvents = await adapter.getAllEvents();
    const existingTasks = await adapter.getAllTasks();

    if (existingEvents.length > 0 || existingTasks.length > 0) {
      console.log(
        "[Migration] Skipping demo data seed - user has existing data",
      );
      return;
    }

    const demoData = generateDemoData();

    // Save events
    await adapter.putEvents(demoData.events);

    // Save tasks by date
    for (const [dateKey, tasks] of Object.entries(demoData.tasks)) {
      await adapter.putTasks(dateKey, tasks);
    }

    console.log(
      `[Migration] Seeded demo data: ${demoData.events.length} events, ` +
        `${Object.values(demoData.tasks).flat().length} tasks`,
    );
  },
};
