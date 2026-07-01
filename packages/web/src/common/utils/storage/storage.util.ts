import dayjs from "@core/util/date/dayjs";
import { getTaskRepository } from "@web/common/repositories/task/task.repository.util";
import { ensureOfflineDataStoreReady } from "@web/common/storage/offline-data/offline-data.store.registry";
import { type Task } from "@web/common/types/task.types";
import { type CompassTasksSavedEventDetail } from "./storage.types";

export const TODAY_TASKS_STORAGE_KEY_PREFIX = "compass.today.tasks";
export const COMPASS_TASKS_SAVED_EVENT_NAME = "compass.tasks.saved" as const;

export function getDateKey(date: Date = new Date()): string {
  return dayjs(date).format(dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT);
}

/**
 * Load tasks for a date from storage via TaskRepository.
 * Kept for compatibility with useAvailableTasks and tests.
 */
export async function loadTasksFromStorage(dateKey: string): Promise<Task[]> {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    await ensureOfflineDataStoreReady();
    return await getTaskRepository("local").get(dateKey);
  } catch (error) {
    console.error("Error loading tasks from storage:", error);
    return [];
  }
}

export function dispatchTasksSavedEvent(dateKey: string): void {
  if (typeof window === "undefined") {
    return;
  }

  const eventDetail: CompassTasksSavedEventDetail = { dateKey };
  window.dispatchEvent(
    new CustomEvent(COMPASS_TASKS_SAVED_EVENT_NAME, {
      detail: eventDetail,
    }),
  );
}
