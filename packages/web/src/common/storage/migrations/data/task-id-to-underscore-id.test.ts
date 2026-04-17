import { describe, expect, it, mock } from "bun:test";
import { createMockTask } from "@web/__tests__/utils/factories/task.factory";
import { type StorageAdapter } from "@web/common/storage/adapter/storage.adapter";
import { taskIdToUnderscoreIdMigration } from "./task-id-to-underscore-id";

type MockedStorageAdapter = {
  [K in keyof StorageAdapter]: ReturnType<typeof mock>;
};

function createMockAdapter(): MockedStorageAdapter {
  return {
    initialize: mock().mockResolvedValue(undefined),
    isReady: mock().mockReturnValue(true),
    getTasks: mock().mockResolvedValue([]),
    getAllTasks: mock().mockResolvedValue([]),
    putTasks: mock().mockResolvedValue(undefined),
    putTask: mock().mockResolvedValue(undefined),
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

describe("taskIdToUnderscoreIdMigration", () => {
  it("maps legacy id to _id and re-saves tasks", async () => {
    const adapter = createMockAdapter();
    const legacyTasks = [
      {
        id: "legacy-1",
        title: "Task 1",
        status: "todo" as const,
        order: 0,
        createdAt: "2025-01-15T10:00:00.000Z",
        dateKey: "2025-01-15",
      },
      {
        id: "legacy-2",
        title: "Task 2",
        status: "completed" as const,
        order: 1,
        createdAt: "2025-01-15T11:00:00.000Z",
        dateKey: "2025-01-15",
      },
    ];
    adapter.getAllTasks.mockResolvedValue(legacyTasks as never);

    await taskIdToUnderscoreIdMigration.migrate(adapter);

    expect(adapter.putTasks).toHaveBeenCalledWith(
      "2025-01-15",
      expect.arrayContaining([
        expect.objectContaining({ _id: "legacy-1", title: "Task 1" }),
        expect.objectContaining({ _id: "legacy-2", title: "Task 2" }),
      ]),
    );
  });

  it("preserves tasks that already have _id", async () => {
    const adapter = createMockAdapter();
    const validTask = createMockTask({ _id: "valid-1", title: "Valid" });
    adapter.getAllTasks.mockResolvedValue([
      { ...validTask, dateKey: "2025-01-15" },
    ] as never);

    await taskIdToUnderscoreIdMigration.migrate(adapter);

    expect(adapter.putTasks).toHaveBeenCalledWith(
      "2025-01-15",
      expect.arrayContaining([expect.objectContaining({ _id: "valid-1" })]),
    );
  });

  it("skips tasks with neither id nor _id", async () => {
    const adapter = createMockAdapter();
    const validTask = createMockTask({ _id: "valid-1" });
    const invalidTask = {
      title: "No ID",
      status: "todo" as const,
      order: 0,
      createdAt: "2025-01-15T10:00:00.000Z",
      dateKey: "2025-01-15",
    };
    adapter.getAllTasks.mockResolvedValue([
      { ...validTask, dateKey: "2025-01-15" },
      invalidTask,
    ] as never);

    await taskIdToUnderscoreIdMigration.migrate(adapter);

    expect(adapter.putTasks).toHaveBeenCalledWith(
      "2025-01-15",
      expect.arrayContaining([expect.objectContaining({ _id: "valid-1" })]),
    );
    expect(adapter.putTasks.mock.calls[0][1]).toHaveLength(1);
  });

  it("clears dateKeys that contain only invalid tasks (neither id nor _id)", async () => {
    const adapter = createMockAdapter();
    const invalidTask = {
      title: "No ID",
      status: "todo" as const,
      order: 0,
      createdAt: "2025-01-16T10:00:00.000Z",
      dateKey: "2025-01-16",
    };
    adapter.getAllTasks.mockResolvedValue([invalidTask] as never);

    await taskIdToUnderscoreIdMigration.migrate(adapter);

    expect(adapter.putTasks).toHaveBeenCalledWith("2025-01-16", []);
  });

  it("does nothing when getAllTasks returns empty", async () => {
    const adapter = createMockAdapter();
    adapter.getAllTasks.mockResolvedValue([]);

    await taskIdToUnderscoreIdMigration.migrate(adapter);

    expect(adapter.putTasks).not.toHaveBeenCalled();
  });
});
