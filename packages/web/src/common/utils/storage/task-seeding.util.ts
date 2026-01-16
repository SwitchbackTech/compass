import { v4 as uuidv4 } from "uuid";
import { Task } from "@web/common/types/task.types";
import {
  loadTasksFromStorage,
  saveTasksToStorage,
} from "@web/common/utils/storage/storage.util";

/**
 * Initial task titles to seed for new users
 */
const INITIAL_TASK_TITLES = ["Review project proposal", "Write weekly report"];

/**
 * Seeds initial tasks for a given date if no tasks exist
 * @param dateKey - Date key in format YYYY-MM-DD
 * @returns Array of seeded tasks
 */
export function seedInitialTasks(dateKey: string): Task[] {
  const existingTasks = loadTasksFromStorage(dateKey);

  // If tasks already exist, return them
  if (existingTasks.length > 0) {
    return existingTasks;
  }

  // Create initial tasks
  const initialTasks: Task[] = INITIAL_TASK_TITLES.map((title, index) => ({
    id: uuidv4(),
    title,
    status: "todo" as const,
    createdAt: new Date().toISOString(),
    order: index,
  }));

  // Save to localStorage
  saveTasksToStorage(dateKey, initialTasks);

  return initialTasks;
}
