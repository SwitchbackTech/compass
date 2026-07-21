import {
  type CommandPaletteViewName,
  getNavigationCommandItems,
} from "@web/common/constants/navigation.cmd.constants";
import { describe, expect, it } from "bun:test";

describe("getNavigationCommandItems", () => {
  const noopHandlers = {
    onGoToToday: () => {},
    onNavigateToView: () => {},
    onShowShortcuts: () => {},
  };

  it("lists Today first, then Day, Week, Life, then shortcuts", () => {
    const labels = getNavigationCommandItems(noopHandlers).map(
      (item) => item.label,
    );
    expect(labels).toEqual([
      "Go to Today",
      "Go to Day",
      "Go to Week",
      "Go to Life",
      "Show Shortcuts",
    ]);
  });

  it("can list only view navigation for non-calendar surfaces", () => {
    const labels = getNavigationCommandItems({
      onNavigateToView: () => {},
    }).map((item) => item.label);

    expect(labels).toEqual(["Go to Day", "Go to Week", "Go to Life"]);
  });

  it("advertises the Life shortcut in the command palette", () => {
    const life = getNavigationCommandItems(noopHandlers).find(
      (item) => item.id === "go-to-life",
    );

    expect(life?.shortcut).toBe("l");
  });

  it("runs the matching navigation callbacks", () => {
    const navigatedViews: CommandPaletteViewName[] = [];
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
    items.find((item) => item.id === "go-to-life")?.onClick?.();
    items.find((item) => item.id === "today")?.onClick?.();
    items.find((item) => item.id === "show-shortcuts")?.onClick?.();

    expect(navigatedViews).toEqual(["day", "week", "life"]);
    expect(didGoToToday).toBe(true);
    expect(didShowShortcuts).toBe(true);
  });
});
