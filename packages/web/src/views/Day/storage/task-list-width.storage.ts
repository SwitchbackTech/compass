import { z } from "zod";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { persistentBrowserStore } from "@web/common/storage/browser-key-value.store";
import {
  clampTaskListWidth,
  TASK_LIST_DEFAULT_WIDTH,
} from "@web/views/Day/storage/task-list-width.constants";

const StoredWidthSchema = z.coerce.number().int();

export function readTaskListWidth(): number {
  const stored = persistentBrowserStore.get(STORAGE_KEYS.DAY_TASK_LIST_WIDTH);
  if (stored === null) return TASK_LIST_DEFAULT_WIDTH;

  const parsed = StoredWidthSchema.safeParse(stored);
  return parsed.success
    ? clampTaskListWidth(parsed.data)
    : TASK_LIST_DEFAULT_WIDTH;
}

export function writeTaskListWidth(width: number): void {
  persistentBrowserStore.set(STORAGE_KEYS.DAY_TASK_LIST_WIDTH, String(width));
}
