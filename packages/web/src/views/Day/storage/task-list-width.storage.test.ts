import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import {
  TASK_LIST_DEFAULT_WIDTH,
  TASK_LIST_MAX_WIDTH,
  TASK_LIST_MIN_WIDTH,
} from "@web/views/Day/storage/task-list-width.constants";
import {
  readTaskListWidth,
  writeTaskListWidth,
} from "@web/views/Day/storage/task-list-width.storage";
import { beforeEach, describe, expect, it } from "bun:test";

describe("task list width storage", () => {
  beforeEach(() => localStorage.clear());

  it("returns the default for missing or invalid values", () => {
    expect(readTaskListWidth()).toBe(TASK_LIST_DEFAULT_WIDTH);

    localStorage.setItem(STORAGE_KEYS.DAY_TASK_LIST_WIDTH, "invalid");

    expect(readTaskListWidth()).toBe(TASK_LIST_DEFAULT_WIDTH);
  });

  it("clamps stored widths to the supported range", () => {
    localStorage.setItem(
      STORAGE_KEYS.DAY_TASK_LIST_WIDTH,
      String(TASK_LIST_MIN_WIDTH - 1),
    );
    expect(readTaskListWidth()).toBe(TASK_LIST_MIN_WIDTH);

    localStorage.setItem(
      STORAGE_KEYS.DAY_TASK_LIST_WIDTH,
      String(TASK_LIST_MAX_WIDTH + 1),
    );
    expect(readTaskListWidth()).toBe(TASK_LIST_MAX_WIDTH);
  });

  it("writes widths through the storage abstraction", () => {
    writeTaskListWidth(420);

    expect(localStorage.getItem(STORAGE_KEYS.DAY_TASK_LIST_WIDTH)).toBe("420");
  });
});
