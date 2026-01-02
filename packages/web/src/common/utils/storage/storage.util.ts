import dayjs from "@core/util/date/dayjs";
import { Task, isTask } from "@web/common/types/task.types";
import {
  getOnboardingProgress,
  updateOnboardingProgress,
} from "@web/views/Onboarding/utils/onboardingStorage.util";

export const TODAY_TASKS_STORAGE_KEY_PREFIX = "compass.today.tasks";
export const COMPASS_TASKS_SAVED_EVENT_NAME = "compass.tasks.saved" as const;

/**
 * Event detail for the "compass.tasks.saved" custom event.
 * Dispatched when tasks are saved to localStorage to enable same-tab synchronization.
 */
export interface CompassTasksSavedEventDetail {
  dateKey: string;
}

export type CompassTasksSavedEvent = CustomEvent<CompassTasksSavedEventDetail>;

export function getDateKey(date: Date = new Date()): string {
  return dayjs(date).format(dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT);
}

export function getStorageKey(dateKey: string): string {
  return `${TODAY_TASKS_STORAGE_KEY_PREFIX}.${dateKey}`;
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
    const eventDetail: CompassTasksSavedEventDetail = { dateKey };
    window.dispatchEvent(
      new CustomEvent(COMPASS_TASKS_SAVED_EVENT_NAME, {
        detail: eventDetail,
      }),
    );
  } catch (error) {
    console.error("Error saving tasks to localStorage:", error);
  }
}

export function loadTodayTasks(): Task[] {
  const dateKey = getDateKey();
  return loadTasksFromStorage(dateKey);
}

export function updateTasksForDate(
  dateKey: string,
  updater: (tasks: Task[]) => Task[],
): Task[] {
  const updatedTasks = updater(loadTasksFromStorage(dateKey));
  saveTasksToStorage(dateKey, updatedTasks);
  return updatedTasks;
}

export function updateTodayTasks(updater: (tasks: Task[]) => Task[]): Task[] {
  const dateKey = getDateKey();
  return updateTasksForDate(dateKey, updater);
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
  return getOnboardingProgress().isStorageWarningSeen;
}

export function markStorageInfoAsSeen(): void {
  if (typeof window === "undefined") {
    return;
  }
  updateOnboardingProgress({ isStorageWarningSeen: true });
}
