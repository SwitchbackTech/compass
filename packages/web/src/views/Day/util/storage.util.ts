import dayjs from "@core/util/date/dayjs";
import { Task, isTask } from "../task.types";

const STORAGE_KEY_PREFIX = "compass.today.tasks";

export function getDateKey(date: Date): string {
  return dayjs(date).utc().format("YYYY-MM-DD");
}

export function getStorageKey(dateKey: string): string {
  return `${STORAGE_KEY_PREFIX}.${dateKey}`;
}

export function loadTasksFromStorage(dateKey: string): Task[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawTasks = window.localStorage.getItem(getStorageKey(dateKey));
    if (!rawTasks) {
      return [];
    }

    const parsed = JSON.parse(rawTasks);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isTask);
  } catch (error) {
    console.error("Error loading tasks from localStorage:", error);
    return [];
  }
}

export function saveTasksToStorage(dateKey: string, tasks: Task[]): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(getStorageKey(dateKey), JSON.stringify(tasks));
  } catch (error) {
    console.error("Error saving tasks to localStorage:", error);
  }
}
