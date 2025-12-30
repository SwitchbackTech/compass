import { faker } from "@faker-js/faker";
import { Task } from "@web/common/types/task.types";

/**
 * Creates a mock task with optional overrides
 * @param overrides - Partial task properties to override defaults
 * @returns A complete Task object
 */
export function createMockTask(overrides: Partial<Task> = {}): Task {
  return {
    id: faker.string.uuid(),
    title: faker.lorem.sentence({ min: 3, max: 5 }),
    status: "todo",
    order: faker.number.int({ min: 0, max: 100 }),
    createdAt: faker.date.recent().toISOString(),
    ...overrides,
  };
}
