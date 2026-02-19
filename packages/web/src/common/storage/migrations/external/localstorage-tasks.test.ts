/**
 * Tests for the localStorage tasks migration.
 */
import { createMockTask } from "@web/__tests__/utils/factories/task.factory";
import { StorageAdapter } from "@web/common/storage/adapter/storage.adapter";
import { localStorageTasksMigration } from "./localstorage-tasks";

const TASK_KEY_PREFIX = "compass.today.tasks.";

function createMockAdapter(): jest.Mocked<StorageAdapter> {
  const tasksByDate = new Map<string, ReturnType<typeof createMockTask>[]>();

  return {
    initialize: jest.fn().mockResolvedValue(undefined),
    isReady: jest.fn().mockReturnValue(true),
    getTasks: jest.fn().mockImplementation(async (dateKey: string) => {
      return tasksByDate.get(dateKey) ?? [];
    }),
    getAllTasks: jest.fn().mockResolvedValue([]),
    putTasks: jest.fn().mockImplementation(async (dateKey: string, tasks) => {
      tasksByDate.set(dateKey, tasks);
    }),
    deleteTask: jest.fn().mockResolvedValue(undefined),
    moveTask: jest.fn().mockResolvedValue(undefined),
    clearAllTasks: jest.fn().mockResolvedValue(undefined),
    getEvents: jest.fn().mockResolvedValue([]),
    getAllEvents: jest.fn().mockResolvedValue([]),
    putEvent: jest.fn().mockResolvedValue(undefined),
    putEvents: jest.fn().mockResolvedValue(undefined),
    deleteEvent: jest.fn().mockResolvedValue(undefined),
    clearAllEvents: jest.fn().mockResolvedValue(undefined),
    getMigrationRecords: jest.fn().mockResolvedValue([]),
    setMigrationRecord: jest.fn().mockResolvedValue(undefined),
  };
}

describe("localStorageTasksMigration", () => {
  beforeEach(() => {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(TASK_KEY_PREFIX)) {
        localStorage.removeItem(key);
      }
    }
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
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
});
