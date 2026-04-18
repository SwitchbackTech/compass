/**
 * Tests for the localStorage tasks migration.
 */
import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import { createMockTask } from "@web/__tests__/utils/factories/task.factory";
import { type StorageAdapter } from "@web/common/storage/adapter/storage.adapter";
import { localStorageTasksMigration } from "./localstorage-tasks";

const TASK_KEY_PREFIX = "compass.today.tasks.";

type MockedStorageAdapter = {
  [K in keyof StorageAdapter]: ReturnType<typeof mock>;
};

function createMockAdapter(): MockedStorageAdapter {
  const tasksByDate = new Map<string, ReturnType<typeof createMockTask>[]>();

  return {
    initialize: mock().mockResolvedValue(undefined),
    isReady: mock().mockReturnValue(true),
    getTasks: mock().mockImplementation(async (dateKey: string) => {
      return tasksByDate.get(dateKey) ?? [];
    }),
    getAllTasks: mock().mockResolvedValue([]),
    putTasks: mock().mockImplementation(async (dateKey: string, tasks) => {
      tasksByDate.set(dateKey, tasks);
    }),
    putTask: mock().mockImplementation(async (dateKey: string, task) => {
      const existing = tasksByDate.get(dateKey) ?? [];
      const index = existing.findIndex((t) => t._id === task._id);
      const updated =
        index >= 0
          ? existing.map((t, i) => (i === index ? task : t))
          : [...existing, task];
      tasksByDate.set(dateKey, updated);
    }),
    deleteTask: mock().mockResolvedValue(undefined),
    moveTask: mock().mockResolvedValue(undefined),
    clearAllTasks: mock().mockResolvedValue(undefined),
    getEvents: mock().mockResolvedValue([]),
    getAllEvents: mock().mockResolvedValue([]),
    putEvent: mock().mockResolvedValue(undefined),
    putEvents: mock().mockResolvedValue(undefined),
    deleteEvent: mock().mockResolvedValue(undefined),
    clearAllEvents: mock().mockResolvedValue(undefined),
    getMigrationRecords: mock().mockResolvedValue([]),
    setMigrationRecord: mock().mockResolvedValue(undefined),
    close: mock(),
  };
}

describe("localStorageTasksMigration", () => {
  let consoleWarnSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(TASK_KEY_PREFIX)) {
        localStorage.removeItem(key);
      }
    }
    consoleWarnSpy = spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  it("skips when no task keys exist in localStorage", async () => {
    const adapter = createMockAdapter();

    await localStorageTasksMigration.migrate(adapter);

    expect(adapter.getTasks).not.toHaveBeenCalled();
    expect(adapter.putTasks).not.toHaveBeenCalled();
  });

  it("imports tasks from localStorage to adapter", async () => {
    const task = createMockTask({ _id: "task-1", title: "Test Task" });
    const dateKey = "2025-01-15";
    localStorage.setItem(
      `${TASK_KEY_PREFIX}${dateKey}`,
      JSON.stringify([task]),
    );

    const adapter = createMockAdapter();
    adapter.getTasks.mockResolvedValue([]);

    await localStorageTasksMigration.migrate(adapter);

    expect(adapter.getTasks).toHaveBeenCalledWith(dateKey);
    expect(adapter.putTasks).toHaveBeenCalledWith(dateKey, [task]);
  });

  it("removes successfully migrated keys from localStorage", async () => {
    const task = createMockTask({ _id: "task-1" });
    const dateKey = "2025-01-15";
    const storageKey = `${TASK_KEY_PREFIX}${dateKey}`;
    localStorage.setItem(storageKey, JSON.stringify([task]));

    const adapter = createMockAdapter();
    adapter.getTasks.mockResolvedValue([]);

    await localStorageTasksMigration.migrate(adapter);

    expect(localStorage.getItem(storageKey)).toBeNull();
  });

  it("maps legacy id field to _id", async () => {
    const legacyTask = {
      id: "legacy-task-1",
      title: "Legacy Task",
      status: "todo",
      order: 0,
      createdAt: "2025-01-15T00:00:00.000Z",
      user: "user-1",
    };
    const dateKey = "2025-01-15";
    localStorage.setItem(
      `${TASK_KEY_PREFIX}${dateKey}`,
      JSON.stringify([legacyTask]),
    );

    const adapter = createMockAdapter();
    adapter.getTasks.mockResolvedValue([]);

    await localStorageTasksMigration.migrate(adapter);

    expect(adapter.putTasks).toHaveBeenCalledWith(
      dateKey,
      expect.arrayContaining([
        expect.objectContaining({ _id: "legacy-task-1", title: "Legacy Task" }),
      ]),
    );
  });

  it("does not duplicate tasks that already exist in adapter", async () => {
    const task = createMockTask({ _id: "task-1", title: "Existing" });
    const dateKey = "2025-01-15";
    localStorage.setItem(
      `${TASK_KEY_PREFIX}${dateKey}`,
      JSON.stringify([task]),
    );

    const adapter = createMockAdapter();
    adapter.getTasks.mockResolvedValue([task]);

    await localStorageTasksMigration.migrate(adapter);

    expect(adapter.putTasks).not.toHaveBeenCalled();
  });

  it("merges new tasks with existing tasks for same date", async () => {
    const existingTask = createMockTask({ _id: "task-1", title: "Existing" });
    const newTask = createMockTask({ _id: "task-2", title: "New" });
    const dateKey = "2025-01-15";
    localStorage.setItem(
      `${TASK_KEY_PREFIX}${dateKey}`,
      JSON.stringify([newTask]),
    );

    const adapter = createMockAdapter();
    adapter.getTasks.mockResolvedValue([existingTask]);

    await localStorageTasksMigration.migrate(adapter);

    expect(adapter.putTasks).toHaveBeenCalledWith(dateKey, [
      existingTask,
      newTask,
    ]);
  });

  it("skips invalid JSON entries and keeps them for retry", async () => {
    const consoleErrorSpy = spyOn(console, "error").mockImplementation(() => {});

    const validTask = createMockTask({ _id: "task-1" });
    const dateKey = "2025-01-15";
    const validKey = `${TASK_KEY_PREFIX}${dateKey}`;
    const invalidKey = `${TASK_KEY_PREFIX}2025-01-16`;

    localStorage.setItem(validKey, JSON.stringify([validTask]));
    localStorage.setItem(invalidKey, "invalid json {{{");

    const adapter = createMockAdapter();
    adapter.getTasks.mockResolvedValue([]);

    await localStorageTasksMigration.migrate(adapter);

    expect(localStorage.getItem(validKey)).toBeNull();
    expect(localStorage.getItem(invalidKey)).toBe("invalid json {{{");
  });

  it("skips non-array parsed values and does not remove key", async () => {
    const dateKey = "2025-01-15";
    const storageKey = `${TASK_KEY_PREFIX}${dateKey}`;
    localStorage.setItem(storageKey, JSON.stringify("not an array"));

    const adapter = createMockAdapter();

    await localStorageTasksMigration.migrate(adapter);

    expect(adapter.putTasks).not.toHaveBeenCalled();
    expect(localStorage.getItem(storageKey)).toBeTruthy();
  });

  it("reports incomplete when task keys remain in localStorage", async () => {
    const dateKey = "2025-01-15";
    localStorage.setItem(
      `${TASK_KEY_PREFIX}${dateKey}`,
      JSON.stringify("not an array"),
    );

    expect(localStorageTasksMigration.isComplete?.()).toBe(false);
  });

  it("reports complete after all task keys are migrated", async () => {
    const task = createMockTask({ _id: "task-1", title: "Test Task" });
    const dateKey = "2025-01-15";
    localStorage.setItem(
      `${TASK_KEY_PREFIX}${dateKey}`,
      JSON.stringify([task]),
    );

    const adapter = createMockAdapter();
    adapter.getTasks.mockResolvedValue([]);

    await localStorageTasksMigration.migrate(adapter);

    expect(localStorageTasksMigration.isComplete?.()).toBe(true);
  });
});
