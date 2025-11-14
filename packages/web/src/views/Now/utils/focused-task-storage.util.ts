import { STORAGE_KEYS } from "@web/common/constants/storage.constants";

export function getFocusedTaskId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage.getItem(STORAGE_KEYS.FOCUSED_TASK_ID);
  } catch (error) {
    console.error("Error loading focused task ID from localStorage:", error);
    return null;
  }
}

export function setFocusedTaskId(taskId: string | null): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (taskId === null) {
      window.localStorage.removeItem(STORAGE_KEYS.FOCUSED_TASK_ID);
    } else {
      window.localStorage.setItem(STORAGE_KEYS.FOCUSED_TASK_ID, taskId);
    }
  } catch (error) {
    console.error("Error saving focused task ID to localStorage:", error);
  }
}

export function clearFocusedTask(): void {
  setFocusedTaskId(null);
}
