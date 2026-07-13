import { Priorities } from "@core/constants/core.constants";
import { DateTimeSchema, EventIdSchema } from "@core/types/domain-primitives";
import {
  type Event,
  type EventContent,
  EventScheduleSchema,
} from "@core/types/event.contracts";
import dayjs from "@core/util/date/dayjs";
import { getLocalCalendarSentinelId } from "@web/calendars/local-calendar.sentinel";
import { type LocalEventRecord } from "@web/common/storage/types/local-event.record";
import { type Task } from "@web/common/types/task.types";
import { getBrowserTimeZone } from "@web/common/utils/datetime/web.date.util";
import { createObjectIdString } from "@web/common/utils/id/object-id.util";
import { getModifierKeyLabel } from "@web/shortcuts/shortcut.util";
import { VIEW_SHORTCUTS } from "@web/shortcuts/shortcuts.constants";
import { type OfflineDataStore } from "../../offline-data/offline-data.store";
import { type ExternalMigration } from "../migration.types";

/**
 * Creates a demo LocalEventRecord (B13/D) with sensible defaults, marked
 * `isDemo` so it's excluded from `syncLocalEventsToCloud`.
 */
function createEventRecord(overrides: {
  title: string;
  description?: string;
  priority?: Event["priority"];
  schedule:
    | { kind: "timed"; start: string; end: string; timeZone: string }
    | { kind: "allDay"; start: string; end: string };
}): LocalEventRecord {
  const id = EventIdSchema.parse(createObjectIdString());
  const content: EventContent = {
    kind: "details",
    title: overrides.title,
    description: overrides.description ?? "",
  };
  const now = DateTimeSchema.parse(new Date().toISOString());

  const event: Event = {
    id,
    calendarId: getLocalCalendarSentinelId(),
    content,
    schedule: EventScheduleSchema.parse(overrides.schedule),
    recurrence: { kind: "single" },
    priority: overrides.priority ?? Priorities.UNASSIGNED,
    createdAt: now,
    updatedAt: null,
  };

  return { version: 2, id, event, isDemo: true };
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
    user: "unauthenticated",
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
  const modKey = getModifierKeyLabel();
  const timeZone = getBrowserTimeZone();

  // Helper for creating timed events today (clone to avoid mutating now).
  // 15-minute-aligned, consistent with event creation in the app.
  const todayAt = (h: number, m = 0) =>
    now.clone().hour(h).minute(m).second(0).millisecond(0).format();

  // ─── Regular Events (Today) ─────────────────────────────────────────────────
  const todayEvents: LocalEventRecord[] = [
    createEventRecord({
      title: "Morning standup",
      description:
        "Let's be honest. No one here has actually done anything. You are just making things up as you go. And yet, all of you sit here, pretending as if we are making progress. It seems, my dear team, that the only thing we do efficiently is exceed the stand up time.",
      priority: Priorities.WORK,
      schedule: {
        kind: "timed",
        start: todayAt(9, 0),
        end: todayAt(9, 30),
        timeZone,
      },
    }),
    createEventRecord({
      title: "Try Compass",
      description: `Welcome! Explore the calendar and tasks. When ready to bring in Google events, select 'Connect Google Calendar' from the command palette (${modKey}+K)`,
      priority: Priorities.UNASSIGNED,
      schedule: {
        kind: "timed",
        start: todayAt(10, 0),
        end: todayAt(11, 0),
        timeZone,
      },
    }),
    createEventRecord({
      title: "Exercise",
      description: "I'm sorry for what I said during burpees.",
      priority: Priorities.SELF,
      schedule: {
        kind: "timed",
        start: todayAt(12, 0),
        end: todayAt(13, 0),
        timeZone,
      },
    }),
    createEventRecord({
      title: "Call a friend",
      description: "Of all possessions, a friend is the most precious.",
      priority: Priorities.RELATIONS,
      schedule: {
        kind: "timed",
        start: todayAt(17, 0),
        end: todayAt(18, 0),
        timeZone,
      },
    }),
    createEventRecord({
      title: "Deep work day",
      description:
        "The ability to perform deep work is becoming increasingly rare at exactly the same time it is becoming increasingly valuable in our economy. As a consequence, the few who cultivate this skill, and then make it the core of their working life, will thrive.",
      priority: Priorities.WORK,
      schedule: {
        kind: "allDay",
        start: today,
        end: dayjs(today).add(1, "day").toYearMonthDayString(),
      },
    }),
  ];

  // ─── Tasks (Today) ──────────────────────────────────────────────────────────
  const todayTasks: Task[] = [
    createTask({
      title: `Open command palette (${modKey} + K)`,
      order: 0,
    }),
    createTask({
      title: "Move this forward",
      order: 1,
    }),
    createTask({
      title: "Move this backward",
      order: 2,
    }),
    createTask({
      title: `Go to Week view (${VIEW_SHORTCUTS.week.key})`,
      order: 3,
    }),
    createTask({
      title: "Move this to the top",
      order: 4,
    }),
  ];

  // ─── Tasks (Yesterday) - Completed ──────────────────────────────────────────
  const yesterdayTasks: Task[] = [
    createTask({
      title: "Lurk on HN",
      status: "completed",
      order: 0,
    }),
    createTask({
      title: "Watch Fireship",
      status: "completed",
      order: 1,
    }),
    createTask({
      title: "Rewrite in Rust",
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
    events: [...todayEvents],
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
 */

const DEMO_DATA_SEED_MIGRATION_ID = "demo-data-seed-v1";

/** localStorage flag key used to track demo data seed completion. */
export const DEMO_DATA_SEED_FLAG_KEY = `compass.migration.${DEMO_DATA_SEED_MIGRATION_ID}`;

export const demoDataSeedMigration: ExternalMigration = {
  id: DEMO_DATA_SEED_MIGRATION_ID,
  description: "Seed demo data for first-time users",

  async migrate(store: OfflineDataStore): Promise<void> {
    const existingEvents = await store.getAllEvents();
    const existingTasks = await store.getAllTasks();
    if (existingEvents.length > 0 || existingTasks.length > 0) return;

    const demoData = generateDemoData();
    await store.putEvents(demoData.events);
    for (const [dateKey, tasks] of Object.entries(demoData.tasks)) {
      await store.putTasks(dateKey, tasks);
    }
  },
};
