import { Task } from "@web/common/types/task.types";
import { createObjectIdString } from "@web/common/utils/id/object-id.util";

export const createMockTask = (overrides?: Partial<Task>): Task => ({
  _id: createObjectIdString(),
  title: "Test Task",
  status: "todo",
  order: 0,
  createdAt: new Date().toISOString(),
  user: "user-1",
  ...overrides,
});
