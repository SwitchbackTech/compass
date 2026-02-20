/**
 * Tests for the demo data seed migration.
 */
import { Priorities } from "@core/constants/core.constants";
import { Event_Core } from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
import { createMockTask } from "@web/__tests__/utils/factories/task.factory";
import {
  StorageAdapter,
  StoredTask,
} from "@web/common/storage/adapter/storage.adapter";
import { Task } from "@web/common/types/task.types";
import { demoDataSeedMigration } from "./demo-data-seed";

function createMockAdapter(): jest.Mocked<StorageAdapter> {
  const tasksByDate = new Map<string, Task[]>();
  const events: Event_Core[] = [];

  return {
    initialize: jest.fn().mockResolvedValue(undefined),
    isReady: jest.fn().mockReturnValue(true),
    getTasks: jest.fn().mockImplementation(async (dateKey: string) => {
      return tasksByDate.get(dateKey) ?? [];
    }),
    getAllTasks: jest.fn().mockImplementation(async () => {
      const allTasks: StoredTask[] = [];
      for (const [dateKey, tasks] of tasksByDate.entries()) {
        for (const task of tasks) {
          allTasks.push({ ...task, dateKey });
        }
      }
      return allTasks;
    }),
    putTasks: jest.fn().mockImplementation(async (dateKey: string, tasks) => {
      tasksByDate.set(dateKey, tasks);
    }),
    putTask: jest.fn().mockResolvedValue(undefined),
    deleteTask: jest.fn().mockResolvedValue(undefined),
    moveTask: jest.fn().mockResolvedValue(undefined),
    clearAllTasks: jest.fn().mockResolvedValue(undefined),
    getEvents: jest.fn().mockResolvedValue(events),
    getAllEvents: jest.fn().mockImplementation(async () => events),
    putEvent: jest.fn().mockImplementation(async (event: Event_Core) => {
      events.push(event);
    }),
    putEvents: jest.fn().mockImplementation(async (newEvents: Event_Core[]) => {
      events.push(...newEvents);
    }),
    deleteEvent: jest.fn().mockResolvedValue(undefined),
    clearAllEvents: jest.fn().mockResolvedValue(undefined),
    getMigrationRecords: jest.fn().mockResolvedValue([]),
    setMigrationRecord: jest.fn().mockResolvedValue(undefined),
  };
}

describe("demoDataSeedMigration", () => {
  beforeEach(() => {
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("seeds demo data when storage is empty", async () => {
    const adapter = createMockAdapter();

    await demoDataSeedMigration.migrate(adapter);

    expect(adapter.putEvents).toHaveBeenCalled();
    expect(adapter.putTasks).toHaveBeenCalled();

    // Verify events were created (7 total: 5 today + 2 someday)
    const eventsCall = adapter.putEvents.mock.calls[0][0] as Event_Core[];
    expect(eventsCall).toHaveLength(7);

    // Verify tasks were created for 3 days
    expect(adapter.putTasks).toHaveBeenCalledTimes(3);
  });

  it("skips seeding when events already exist", async () => {
    const adapter = createMockAdapter();
    adapter.getAllEvents.mockResolvedValue([
      {
        _id: "existing-event",
        startDate: "2025-01-15T09:00:00Z",
        endDate: "2025-01-15T10:00:00Z",
        origin: "compass",
        priority: "unassigned",
        user: "user-1",
      } as Event_Core,
    ]);

    await demoDataSeedMigration.migrate(adapter);

    expect(adapter.putEvents).not.toHaveBeenCalled();
    expect(adapter.putTasks).not.toHaveBeenCalled();
  });

  it("skips seeding when tasks already exist", async () => {
    const adapter = createMockAdapter();
    adapter.getAllTasks.mockResolvedValue([
      { ...createMockTask(), dateKey: "2025-01-15" },
    ]);

    await demoDataSeedMigration.migrate(adapter);

    expect(adapter.putEvents).not.toHaveBeenCalled();
    expect(adapter.putTasks).not.toHaveBeenCalled();
  });

  it("creates events with relative dates (not hardcoded)", async () => {
    const adapter = createMockAdapter();

    await demoDataSeedMigration.migrate(adapter);

    const eventsCall = adapter.putEvents.mock.calls[0][0] as Event_Core[];
    const today = dayjs().toYearMonthDayString();

    // Check that at least one timed event starts today
    const todayEvents = eventsCall.filter(
      (e) => !e.isSomeday && e.startDate.startsWith(today),
    );
    expect(todayEvents.length).toBeGreaterThan(0);
  });

  it("creates tasks for today, yesterday, and tomorrow", async () => {
    const adapter = createMockAdapter();

    await demoDataSeedMigration.migrate(adapter);

    const today = dayjs().toYearMonthDayString();
    const yesterday = dayjs().subtract(1, "day").toYearMonthDayString();
    const tomorrow = dayjs().add(1, "day").toYearMonthDayString();

    const putTasksCalls = adapter.putTasks.mock.calls;
    const dateKeys = putTasksCalls.map((call) => call[0]);

    expect(dateKeys).toContain(today);
    expect(dateKeys).toContain(yesterday);
    expect(dateKeys).toContain(tomorrow);
  });

  it("creates yesterday tasks as completed", async () => {
    const adapter = createMockAdapter();

    await demoDataSeedMigration.migrate(adapter);

    const yesterday = dayjs().subtract(1, "day").toYearMonthDayString();
    const putTasksCalls = adapter.putTasks.mock.calls;
    const yesterdayCall = putTasksCalls.find((call) => call[0] === yesterday);

    expect(yesterdayCall).toBeDefined();
    const yesterdayTasks = yesterdayCall![1] as Task[];
    expect(yesterdayTasks.every((t) => t.status === "completed")).toBe(true);
  });

  it("creates events with all four priorities", async () => {
    const adapter = createMockAdapter();

    await demoDataSeedMigration.migrate(adapter);

    const eventsCall = adapter.putEvents.mock.calls[0][0] as Event_Core[];
    const priorities = new Set(eventsCall.map((e) => e.priority));

    expect(priorities.has(Priorities.WORK)).toBe(true);
    expect(priorities.has(Priorities.SELF)).toBe(true);
    expect(priorities.has(Priorities.RELATIONS)).toBe(true);
    expect(priorities.has(Priorities.UNASSIGNED)).toBe(true);
  });

  it("creates someday events for week and month", async () => {
    const adapter = createMockAdapter();

    await demoDataSeedMigration.migrate(adapter);

    const eventsCall = adapter.putEvents.mock.calls[0][0] as Event_Core[];
    const somedayEvents = eventsCall.filter((e) => e.isSomeday);

    expect(somedayEvents).toHaveLength(2);
  });

  it("creates an all-day event for today", async () => {
    const adapter = createMockAdapter();

    await demoDataSeedMigration.migrate(adapter);

    const eventsCall = adapter.putEvents.mock.calls[0][0] as Event_Core[];
    const allDayEvents = eventsCall.filter((e) => e.isAllDay);

    expect(allDayEvents).toHaveLength(1);
    expect(allDayEvents[0].title).toBe("Deep work day");
  });
});
