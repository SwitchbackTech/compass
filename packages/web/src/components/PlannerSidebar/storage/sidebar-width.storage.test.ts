import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import {
  SIDEBAR_DEFAULT_WIDTH,
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_MIN_WIDTH,
} from "@web/components/PlannerSidebar/storage/sidebar-width.constants";
import {
  readSidebarWidth,
  writeSidebarWidth,
} from "@web/components/PlannerSidebar/storage/sidebar-width.storage";
import { beforeEach, describe, expect, it } from "bun:test";

describe("sidebar width storage", () => {
  beforeEach(() => localStorage.clear());

  it("returns the default for missing or invalid values", () => {
    expect(readSidebarWidth()).toBe(SIDEBAR_DEFAULT_WIDTH);

    localStorage.setItem(STORAGE_KEYS.SIDEBAR_WIDTH, "invalid");

    expect(readSidebarWidth()).toBe(SIDEBAR_DEFAULT_WIDTH);
  });

  it("clamps stored widths to the supported range", () => {
    localStorage.setItem(
      STORAGE_KEYS.SIDEBAR_WIDTH,
      String(SIDEBAR_MIN_WIDTH - 1),
    );
    expect(readSidebarWidth()).toBe(SIDEBAR_MIN_WIDTH);

    localStorage.setItem(
      STORAGE_KEYS.SIDEBAR_WIDTH,
      String(SIDEBAR_MAX_WIDTH + 1),
    );
    expect(readSidebarWidth()).toBe(SIDEBAR_MAX_WIDTH);
  });

  it("writes widths through the storage abstraction", () => {
    writeSidebarWidth(360);

    expect(localStorage.getItem(STORAGE_KEYS.SIDEBAR_WIDTH)).toBe("360");
  });
});
