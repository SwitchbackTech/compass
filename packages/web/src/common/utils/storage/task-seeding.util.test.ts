import { Task } from "@web/common/types/task.types";
import {
  getDateKey,
  loadTasksFromStorage,
  saveTasksToStorage,
} from "@web/common/utils/storage/storage.util";
import { seedInitialTasks } from "./task-seeding.util";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

describe("task-seeding.util", () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe("seedInitialTasks", () => {
    it("should seed initial tasks when none exist", () => {
      const dateKey = getDateKey();
      const tasks = seedInitialTasks(dateKey);

      expect(tasks).toHaveLength(2);
      expect(tasks[0].title).toBe("Review project proposal");
      expect(tasks[1].title).toBe("Write weekly report");
      expect(tasks[0].status).toBe("todo");
      expect(tasks[1].status).toBe("todo");
      expect(tasks[0].id).toBeDefined();
      expect(tasks[1].id).toBeDefined();
    });

    it("should return existing tasks if they already exist", () => {
      const dateKey = getDateKey();
      const existingTask: Task = {
        id: "existing-id",
        title: "Existing task",
        status: "todo",
        createdAt: new Date().toISOString(),
        order: 0,
      };

      saveTasksToStorage(dateKey, [existingTask]);
      const tasks = seedInitialTasks(dateKey);

      expect(tasks).toHaveLength(1);
      expect(tasks[0].id).toBe("existing-id");
      expect(tasks[0].title).toBe("Existing task");
    });

    it("should save tasks to localStorage", () => {
      const dateKey = getDateKey();
      seedInitialTasks(dateKey);

      const storedTasks = loadTasksFromStorage(dateKey);
      expect(storedTasks).toHaveLength(2);
    });

    it("should work with different date keys", () => {
      const dateKey1 = "2024-01-01";
      const dateKey2 = "2024-01-02";

      const tasks1 = seedInitialTasks(dateKey1);
      const tasks2 = seedInitialTasks(dateKey2);

      expect(tasks1).toHaveLength(2);
      expect(tasks2).toHaveLength(2);
      expect(tasks1[0].id).not.toBe(tasks2[0].id);
    });
  });
});
