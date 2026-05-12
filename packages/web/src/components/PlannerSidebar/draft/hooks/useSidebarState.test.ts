import { renderHook } from "@testing-library/react";
import { afterAll, beforeEach, describe, expect, it, mock } from "bun:test";

const mockTogglePointerMovementTracking = mock();
let isDNDing = false;

const emptyCategorizedEvents = {
  columns: {
    monthEvents: { eventIds: [], id: "monthEvents" },
    weekEvents: { eventIds: [], id: "weekEvents" },
  },
};

mock.module("@web/common/hooks/usePointerPosition", () => ({
  usePointerPosition: () => ({
    togglePointerMovementTracking: mockTogglePointerMovementTracking,
  }),
}));

mock.module("@web/common/hooks/usePointerState", () => ({
  usePointerState: () => ({
    isOverAllDayRow: false,
    isOverGrid: false,
    isOverMainGrid: false,
  }),
}));

mock.module("@web/ducks/events/selectors/draft.selectors", () => ({
  selectIsDNDing: () => isDNDing,
}));

mock.module("@web/ducks/events/selectors/someday.selectors", () => ({
  selectCategorizedEvents: () => emptyCategorizedEvents,
}));

mock.module("@web/store/store.hooks", () => ({
  useAppSelector: (selector: (state: unknown) => unknown) => selector({}),
}));

const { useSidebarState } =
  require("./useSidebarState") as typeof import("./useSidebarState");

describe("useSidebarState", () => {
  beforeEach(() => {
    isDNDing = false;
    mockTogglePointerMovementTracking.mockClear();
  });

  it("does not pause shared pointer tracking while the sidebar is idle", () => {
    renderHook(() => useSidebarState());

    expect(mockTogglePointerMovementTracking).not.toHaveBeenCalledWith(true);
  });

  it("keeps pointer tracking active while dragging someday events", () => {
    isDNDing = true;

    renderHook(() => useSidebarState());

    expect(mockTogglePointerMovementTracking).toHaveBeenCalledWith(false);
  });
});

afterAll(() => {
  mock.restore();
});
