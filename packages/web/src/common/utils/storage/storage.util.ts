import dayjs from "@core/util/date/dayjs";
import {
  ensureStorageReady,
  getStorageAdapter,
} from "@web/common/storage/adapter/adapter";
import {
  Task,
  normalizeTask,
  normalizeTasks,
} from "@web/common/types/task.types";
import { CompassTasksSavedEventDetail } from "./storage.types";

export const TODAY_TASKS_STORAGE_KEY_PREFIX = "compass.today.tasks";
export const COMPASS_TASKS_SAVED_EVENT_NAME = "compass.tasks.saved" as const;

export function getDateKey(date: Date = new Date()): string {
  return dayjs(date).format(dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT);
}

function dispatchTasksSavedEvent(dateKey: string): void {
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

export async function loadTasksFromStorage(dateKey: string): Promise<Task[]> {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    await ensureStorageReady();
    return await getStorageAdapter().getTasks(dateKey);
  } catch (error) {
    console.error("Error loading tasks from IndexedDB:", error);
    return [];
  }
}

export async function saveTasksToStorage(
  dateKey: string,
  tasks: Task[],
): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  try {
    await ensureStorageReady();
    await getStorageAdapter().putTasks(dateKey, normalizeTasks(tasks));
    dispatchTasksSavedEvent(dateKey);
  } catch (error) {
    console.error("Error saving tasks to IndexedDB:", error);
  }
}

export async function saveTaskToStorage(
  dateKey: string,
  task: Task,
): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  try {
    await ensureStorageReady();
    await getStorageAdapter().putTask(dateKey, normalizeTask(task));
    dispatchTasksSavedEvent(dateKey);
  } catch (error) {
    console.error("Error saving task to storage:", error);
  }
}

export async function loadTodayTasks(): Promise<Task[]> {
  const dateKey = getDateKey();
  return await loadTasksFromStorage(dateKey);
}

export async function updateTasksForDate(
  dateKey: string,
  updater: (tasks: Task[]) => Task[],
): Promise<Task[]> {
  const loadedTasks = await loadTasksFromStorage(dateKey);
  const updatedTasks = updater(loadedTasks);
  await saveTasksToStorage(dateKey, updatedTasks);
  return updatedTasks;
}

export async function updateTodayTasks(
  updater: (tasks: Task[]) => Task[],
): Promise<Task[]> {
  const dateKey = getDateKey();
  return await updateTasksForDate(dateKey, updater);
}

export async function moveTaskToDate(
  task: Task,
  fromDateKey: string,
  toDateKey: string,
): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  try {
    await ensureStorageReady();
    await getStorageAdapter().moveTask(task, fromDateKey, toDateKey);
    dispatchTasksSavedEvent(fromDateKey);
    if (toDateKey !== fromDateKey) {
      dispatchTasksSavedEvent(toDateKey);
    }
  } catch (error) {
    console.error("Error moving task in IndexedDB:", error);
  }
}
