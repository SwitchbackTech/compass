import { act, renderHook } from "@testing-library/react";
import {
  SIDEBAR_AUTO_COLLAPSE_BREAKPOINT,
  TASK_LIST_AUTO_COLLAPSE_BREAKPOINT,
} from "@web/common/constants/responsive.constants";
import {
  selectIsSidebarOpen,
  selectIsTaskListOpen,
  useViewStore,
  viewActions,
} from "@web/events/stores/view.store";
import { useResponsiveLayout } from "./useResponsiveLayout";
import { afterEach, describe, expect, it, mock } from "bun:test";

// Helper to create a mock matchMedia list for a single query
const createMediaQueryMock = (matches: boolean) => {
  const listeners: Array<(e: MediaQueryListEvent) => void> = [];
  return {
    matches,
    media: "",
    onchange: null,
    addListener: mock(),
    removeListener: mock(),
    addEventListener: mock(
      (_event: string, listener: (e: MediaQueryListEvent) => void) => {
        listeners.push(listener);
      },
    ),
    removeEventListener: mock(
      (_event: string, listener: (e: MediaQueryListEvent) => void) => {
        const index = listeners.indexOf(listener);
        if (index !== -1) listeners.splice(index, 1);
      },
    ),
    dispatchEvent: mock(),
    _triggerChange: (newMatches: boolean) => {
      listeners.forEach((listener) => {
        listener({ matches: newMatches } as MediaQueryListEvent);
      });
    },
  };
};

/**
 * Installs a matchMedia mock that returns a distinct media query list per
 * breakpoint, so sidebar and task list crossings can be driven independently.
 */
const setupMatchMedia = ({
  sidebarMatches,
  taskListMatches,
}: {
  sidebarMatches: boolean;
  taskListMatches: boolean;
}) => {
  const sidebarQuery = createMediaQueryMock(sidebarMatches);
  const taskListQuery = createMediaQueryMock(taskListMatches);

  window.matchMedia = mock((query: string) => {
    if (query.includes(`${SIDEBAR_AUTO_COLLAPSE_BREAKPOINT}px`)) {
      return sidebarQuery as unknown as MediaQueryList;
    }
    if (query.includes(`${TASK_LIST_AUTO_COLLAPSE_BREAKPOINT}px`)) {
      return taskListQuery as unknown as MediaQueryList;
    }
    throw new Error(`Unexpected media query: ${query}`);
  });

  return { sidebarQuery, taskListQuery };
};

const getIsSidebarOpen = () => selectIsSidebarOpen(useViewStore.getState());
const getIsTaskListOpen = () => selectIsTaskListOpen(useViewStore.getState());

describe("useResponsiveLayout sidebar", () => {
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it("should open the sidebar on mount when screen is wide (>=1280px)", () => {
    setupMatchMedia({ sidebarMatches: true, taskListMatches: true });

    renderHook(() => useResponsiveLayout());

    expect(getIsSidebarOpen()).toBe(true);
  });

  it("should close the sidebar on mount when screen is narrow (<1280px)", () => {
    setupMatchMedia({ sidebarMatches: false, taskListMatches: true });

    renderHook(() => useResponsiveLayout());

    expect(getIsSidebarOpen()).toBe(false);
  });

  it("should close the sidebar when screen resizes from wide to narrow", () => {
    const { sidebarQuery } = setupMatchMedia({
      sidebarMatches: true,
      taskListMatches: true,
    });

    renderHook(() => useResponsiveLayout());

    expect(getIsSidebarOpen()).toBe(true);

    act(() => {
      sidebarQuery._triggerChange(false);
    });

    expect(getIsSidebarOpen()).toBe(false);
  });

  it("should open the sidebar when screen resizes from narrow to wide", () => {
    const { sidebarQuery } = setupMatchMedia({
      sidebarMatches: false,
      taskListMatches: true,
    });

    renderHook(() => useResponsiveLayout());

    expect(getIsSidebarOpen()).toBe(false);

    act(() => {
      sidebarQuery._triggerChange(true);
    });

    expect(getIsSidebarOpen()).toBe(true);
  });

  it("should keep a manual toggle until the next breakpoint crossing", () => {
    const { sidebarQuery } = setupMatchMedia({
      sidebarMatches: false,
      taskListMatches: true,
    });

    const { rerender } = renderHook(() => useResponsiveLayout());

    expect(getIsSidebarOpen()).toBe(false);

    // User reopens the sidebar while narrow; no crossing happens, so it sticks
    act(() => {
      viewActions.toggleSidebar();
    });
    rerender();

    expect(getIsSidebarOpen()).toBe(true);

    // The next crossing takes over again
    act(() => {
      sidebarQuery._triggerChange(true);
    });
    act(() => {
      sidebarQuery._triggerChange(false);
    });

    expect(getIsSidebarOpen()).toBe(false);
  });

  it("should remove the media query listeners on unmount", () => {
    const { sidebarQuery, taskListQuery } = setupMatchMedia({
      sidebarMatches: true,
      taskListMatches: true,
    });

    const { unmount } = renderHook(() => useResponsiveLayout());
    unmount();

    expect(sidebarQuery.removeEventListener).toHaveBeenCalledTimes(1);
    expect(taskListQuery.removeEventListener).toHaveBeenCalledTimes(1);

    act(() => {
      sidebarQuery._triggerChange(false);
    });

    expect(getIsSidebarOpen()).toBe(true);
  });
});

describe("useResponsiveLayout task list", () => {
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it("should close the task list on mount when screen is narrower than its breakpoint", () => {
    setupMatchMedia({ sidebarMatches: false, taskListMatches: false });

    renderHook(() => useResponsiveLayout());

    expect(getIsTaskListOpen()).toBe(false);
  });

  it("should collapse the sidebar before the task list as the screen shrinks", () => {
    const { sidebarQuery, taskListQuery } = setupMatchMedia({
      sidebarMatches: true,
      taskListMatches: true,
    });

    renderHook(() => useResponsiveLayout());

    // Crossing below 1280px collapses only the sidebar
    act(() => {
      sidebarQuery._triggerChange(false);
    });

    expect(getIsSidebarOpen()).toBe(false);
    expect(getIsTaskListOpen()).toBe(true);

    // Crossing below the task list breakpoint collapses the task list too
    act(() => {
      taskListQuery._triggerChange(false);
    });

    expect(getIsTaskListOpen()).toBe(false);
  });

  it("should reopen the task list when crossing back above its breakpoint", () => {
    const { taskListQuery } = setupMatchMedia({
      sidebarMatches: false,
      taskListMatches: false,
    });

    renderHook(() => useResponsiveLayout());

    expect(getIsTaskListOpen()).toBe(false);

    act(() => {
      taskListQuery._triggerChange(true);
    });

    expect(getIsTaskListOpen()).toBe(true);
  });

  it("should keep a manual task list toggle until the next crossing", () => {
    setupMatchMedia({ sidebarMatches: false, taskListMatches: false });

    renderHook(() => useResponsiveLayout());

    expect(getIsTaskListOpen()).toBe(false);

    act(() => {
      viewActions.toggleTaskList();
    });

    expect(getIsTaskListOpen()).toBe(true);
  });
});
