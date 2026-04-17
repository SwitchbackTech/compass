import { mock } from "bun:test";
import { type StorageAdapter } from "@web/common/storage/adapter/storage.adapter";

/**
 * Creates a mock StorageAdapter for tests.
 *
 * All methods default to empty results or no-op implementations.
 * Override specific methods (e.g., getAllEvents, getAllTasks) as needed per test.
 */
type MockedStorageAdapter = {
  [K in keyof StorageAdapter]: StorageAdapter[K] extends (...args: any[]) => any
    ? ReturnType<typeof mock>
    : StorageAdapter[K];
};

export function createMockStorageAdapter(): MockedStorageAdapter {
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
  };
}
