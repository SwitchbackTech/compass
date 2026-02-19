import { createMockTask } from "@web/__tests__/utils/factories/task.factory";
import { StorageAdapter } from "@web/common/storage/adapter/storage.adapter";
import { taskIdToUnderscoreIdMigration } from "./task-id-to-underscore-id";

function createMockAdapter(): jest.Mocked<StorageAdapter> {
  return {
    initialize: jest.fn().mockResolvedValue(undefined),
    isReady: jest.fn().mockReturnValue(true),
    getTasks: jest.fn().mockResolvedValue([]),
    getAllTasks: jest.fn().mockResolvedValue([]),
    putTasks: jest.fn().mockResolvedValue(undefined),
    putTask: jest.fn().mockResolvedValue(undefined),
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

  it("does nothing when getAllTasks returns empty", async () => {
    const adapter = createMockAdapter();
    adapter.getAllTasks.mockResolvedValue([]);

    await taskIdToUnderscoreIdMigration.migrate(adapter);

    expect(adapter.putTasks).not.toHaveBeenCalled();
  });
});
