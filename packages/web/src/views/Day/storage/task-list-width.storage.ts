import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { persistentBrowserStore } from "@web/common/storage/browser-key-value.store";
import {
  clampTaskListWidth,
  TASK_LIST_DEFAULT_WIDTH,
} from "@web/views/Day/storage/task-list-width.constants";

export function readTaskListWidth(): number {
  const stored = persistentBrowserStore.get(STORAGE_KEYS.DAY_TASK_LIST_WIDTH);
  if (stored === null) return TASK_LIST_DEFAULT_WIDTH;

  const width = Number(stored);
  return Number.isInteger(width)
    ? clampTaskListWidth(width)
    : TASK_LIST_DEFAULT_WIDTH;
}

export function writeTaskListWidth(width: number): void {
  persistentBrowserStore.set(STORAGE_KEYS.DAY_TASK_LIST_WIDTH, String(width));
}
