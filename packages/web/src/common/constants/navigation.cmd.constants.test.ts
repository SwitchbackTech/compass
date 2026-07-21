import { getNavigationCommandItems } from "@web/common/constants/navigation.cmd.constants";
import { type ViewName } from "@web/shortcuts/shortcuts.constants";
import { describe, expect, it } from "bun:test";

describe("getNavigationCommandItems", () => {
  const noopHandlers = {
    onGoToToday: () => {},
    onNavigateToView: () => {},
    onShowShortcuts: () => {},
  };

  it("lists Today first, then Day and Week, then shortcuts", () => {
    const labels = getNavigationCommandItems(noopHandlers).map(
      (item) => item.label,
    );
    expect(labels).toEqual([
      "Go to Today",
      "Go to Day",
      "Go to Week",
      "Show Shortcuts",
    ]);
  });

  it("runs the matching navigation callbacks", () => {
    const navigatedViews: ViewName[] = [];
    let didGoToToday = false;
    let didShowShortcuts = false;
    const items = getNavigationCommandItems({
      onGoToToday: () => {
        didGoToToday = true;
      },
      onNavigateToView: (viewName) => {
        navigatedViews.push(viewName);
      },
      onShowShortcuts: () => {
        didShowShortcuts = true;
      },
    });

    items.find((item) => item.id === "go-to-day")?.onClick?.();
    items.find((item) => item.id === "go-to-week")?.onClick?.();
    items.find((item) => item.id === "today")?.onClick?.();
    items.find((item) => item.id === "show-shortcuts")?.onClick?.();

    expect(navigatedViews).toEqual(["day", "week"]);
    expect(didGoToToday).toBe(true);
    expect(didShowShortcuts).toBe(true);
  });
});
