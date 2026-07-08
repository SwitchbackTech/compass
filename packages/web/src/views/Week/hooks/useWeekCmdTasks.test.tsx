import { act } from "@testing-library/react";
import { type MouseEvent } from "react";
import dayjs from "@core/util/date/dayjs";
import { renderHookWithStore } from "@web/__tests__/render-with-store";
import {
  initialViewState,
  selectIsSidebarOpen,
  useViewStore,
  viewActions,
} from "@web/events/stores/view.store";
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

mock.module("@web/auth/compass/session/session.util", () => ({
  getUserId: mock().mockResolvedValue("mock-user"),
}));

const { useWeekCmdTasks } =
  require("./useWeekCmdTasks") as typeof import("./useWeekCmdTasks");

// `onEventTargetVisibility` (wrapping every command's onClick) defers its
// callback until the row's IntersectionObserver reports non-intersecting.
// The global test env's mock observer never fires that callback, so each
// test captures it here and flushes it manually, mirroring
// event-target-visibility.util.test.ts.
let observerCallback:
  | ((entries: Array<{ isIntersecting: boolean }>) => void)
  | undefined;
const mockObserve = mock();
const mockDisconnect = mock();

const fireClick = async (
  onClick: ((event: MouseEvent<HTMLElement>) => void) | undefined,
) => {
  await act(async () => {
    onClick?.({
      currentTarget: document.createElement("button"),
    } as unknown as MouseEvent<HTMLElement>);
    observerCallback?.([{ isIntersecting: false }]);
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

beforeEach(() => {
  observerCallback = undefined;
  mockObserve.mockClear();
  mockDisconnect.mockClear();
  global.IntersectionObserver = mock((callback) => {
    observerCallback = callback;
    return {
      disconnect: mockDisconnect,
      observe: mockObserve,
      takeRecords: mock(),
      unobserve: mock(),
    };
  }) as unknown as typeof IntersectionObserver;
});

afterEach(() => {
  useViewStore.setState(initialViewState);
});

const renderWeekCmdTasks = () => {
  const startOfView = dayjs("2026-07-05"); // Sunday
  const endOfView = startOfView.add(6, "days");

  return renderHookWithStore(() =>
    useWeekCmdTasks({ endOfView, isCurrentWeek: true, startOfView }),
  );
};

const getItem = (items: ReturnType<typeof useWeekCmdTasks>, id: string) => {
  const item = items.find((candidate) => candidate.id === id);
  if (!item) throw new Error(`Missing command item: ${id}`);
  return item;
};

describe("useWeekCmdTasks", () => {
  it.each([
    "create-someday-week-event",
    "create-someday-month-event",
  ])("opens the sidebar when creating a %s while it's closed", async (id) => {
    viewActions.setSidebarOpen(false);
    const { result } = renderWeekCmdTasks();

    await fireClick(getItem(result.current, id).onClick);

    expect(selectIsSidebarOpen(useViewStore.getState())).toBe(true);
  });

  it("leaves the sidebar open (does not re-toggle) when already open", async () => {
    viewActions.setSidebarOpen(true);
    const { result } = renderWeekCmdTasks();

    await fireClick(
      getItem(result.current, "create-someday-week-event").onClick,
    );

    expect(selectIsSidebarOpen(useViewStore.getState())).toBe(true);
  });
});
