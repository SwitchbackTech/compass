import dayjs from "@core/util/date/dayjs";
import { Task, isTask } from "../task.types";

const STORAGE_KEY_PREFIX = "compass.today.tasks";
const STORAGE_INFO_SEEN_KEY = "compass.day.storage-info-seen";

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
    // Dispatch custom event for same-tab synchronization
    window.dispatchEvent(
      new CustomEvent("compass.tasks.saved", {
        detail: { dateKey },
      }),
    );
  } catch (error) {
    console.error("Error saving tasks to localStorage:", error);
  }
}

export function moveTaskToDate(
  task: Task,
  fromDateKey: string,
  toDateKey: string,
): void {
  // Remove from source date
  const sourceTasks = loadTasksFromStorage(fromDateKey);
  const updatedSourceTasks = sourceTasks.filter((t) => t.id !== task.id);
  saveTasksToStorage(fromDateKey, updatedSourceTasks);

  // Add to target date
  const targetTasks = loadTasksFromStorage(toDateKey);
  const updatedTargetTasks = [...targetTasks, task];
  saveTasksToStorage(toDateKey, updatedTargetTasks);
}

export function hasSeenStorageInfo(): boolean {
  if (typeof window === "undefined") {
    return true;
  }
  return localStorage.getItem(STORAGE_INFO_SEEN_KEY) === "true";
}

export function markStorageInfoAsSeen(): void {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(STORAGE_INFO_SEEN_KEY, "true");
}
