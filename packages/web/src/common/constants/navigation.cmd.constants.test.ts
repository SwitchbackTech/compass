import dayjs from "@core/util/date/dayjs";
import { getNavigationCommandItems } from "@web/common/constants/navigation.cmd.constants";
import { type ViewName } from "@web/shortcuts/shortcuts.constants";
import { describe, expect, it } from "bun:test";

describe("getNavigationCommandItems", () => {
  const today = dayjs("2026-05-28");

  function getItemLabels(currentView: ViewName) {
    return getNavigationCommandItems({
      currentView,
      onGoToToday: () => {},
      onNavigateToView: () => {},
      onShowShortcuts: () => {},
      today,
    }).map((item) => item.label);
  }

  it("returns the other views, today, and shortcuts for the week palette", () => {
    expect(getItemLabels("week")).toEqual([
      "Go to Day",
      "Go to Today (Thursday, May 28)",
      "Show Shortcuts",
    ]);
  });

  it("returns the other views, today, and shortcuts for the day palette", () => {
    expect(getItemLabels("day")).toEqual([
      "Go to Week",
      "Go to Today (Thursday, May 28)",
      "Show Shortcuts",
    ]);
  });

  it("runs the matching navigation callbacks", () => {
    const navigatedViews: ViewName[] = [];
    let didGoToToday = false;
    let didShowShortcuts = false;
    const items = getNavigationCommandItems({
      currentView: "day",
      onGoToToday: () => {
        didGoToToday = true;
      },
      onNavigateToView: (viewName) => {
        navigatedViews.push(viewName);
      },
      onShowShortcuts: () => {
        didShowShortcuts = true;
      },
      today,
    });

    items.find((item) => item.id === "go-to-week")?.onClick?.({} as never);
    items.find((item) => item.id === "today")?.onClick?.({} as never);
    items.find((item) => item.id === "show-shortcuts")?.onClick?.({} as never);

    expect(navigatedViews).toEqual(["week"]);
    expect(didGoToToday).toBe(true);
    expect(didShowShortcuts).toBe(true);
  });
});
