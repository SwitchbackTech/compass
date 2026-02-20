import { StorageAdapter } from "@web/common/storage/adapter/storage.adapter";

/**
 * Creates a mock StorageAdapter for tests.
 *
 * All methods default to empty results or no-op implementations.
 * Override specific methods (e.g., getAllEvents, getAllTasks) as needed per test.
 */
export function createMockStorageAdapter(): jest.Mocked<StorageAdapter> {
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
