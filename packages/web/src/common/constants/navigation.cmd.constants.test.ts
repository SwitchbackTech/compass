import dayjs from "@core/util/date/dayjs";
import { getNavigationCommandItems } from "@web/common/constants/navigation.cmd.constants";
import { type ViewName } from "@web/common/constants/shortcuts.constants";
import { describe, expect, it } from "bun:test";

describe("getNavigationCommandItems", () => {
  const today = dayjs("2026-05-28");

  function getItemLabels(currentView: ViewName) {
    return getNavigationCommandItems({
      currentView,
      onGoToToday: () => {},
      onNavigateToView: () => {},
      today,
    }).map((item) => item.children);
  }

  it("returns the other views and today for the week palette", () => {
    expect(getItemLabels("week")).toEqual([
      "Go to Day [d]",
      "Go to Today (Thursday, May 28) [t]",
    ]);
  });

  it("returns the other views and today for the day palette", () => {
    expect(getItemLabels("day")).toEqual([
      "Go to Week [w]",
      "Go to Today (Thursday, May 28) [t]",
    ]);
  });

  it("runs the matching navigation callbacks", () => {
    const navigatedViews: ViewName[] = [];
    let didGoToToday = false;
    const items = getNavigationCommandItems({
      currentView: "day",
      onGoToToday: () => {
        didGoToToday = true;
      },
      onNavigateToView: (viewName) => {
        navigatedViews.push(viewName);
      },
      today,
    });

    items.find((item) => item.id === "go-to-week")?.onClick?.({} as never);
    items.find((item) => item.id === "today")?.onClick?.({} as never);

    expect(navigatedViews).toEqual(["week"]);
    expect(didGoToToday).toBe(true);
  });
});
