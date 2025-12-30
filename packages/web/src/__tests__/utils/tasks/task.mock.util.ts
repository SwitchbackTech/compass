import { Task } from "@web/common/types/task.types";

/**
 * Creates a mock task with optional overrides
 * @param overrides - Partial task properties to override defaults
 * @returns A complete Task object
 */
export function createMockTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-1",
    title: "Test Task",
    status: "todo",
    order: 0,
    createdAt: "2025-01-01T00:00:00.000Z",
    ...overrides,
  };
}
