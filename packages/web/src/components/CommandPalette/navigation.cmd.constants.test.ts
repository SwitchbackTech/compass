import {
  type CommandPaletteViewName,
  getNavigationCommandItems,
} from "@web/components/CommandPalette/navigation.cmd.constants";
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
      "Show keyboard shortcuts",
    ]);
  });

  it("can list only view navigation for non-calendar surfaces", () => {
    const labels = getNavigationCommandItems({
      onNavigateToView: () => {},
    }).map((item) => item.label);

    expect(labels).toEqual(["Go to Day", "Go to Week", "Go to Life"]);
  });

  it("advertises every view shortcut in the command palette", () => {
    const shortcuts = Object.fromEntries(
      getNavigationCommandItems(noopHandlers).map((item) => [
        item.id,
        item.shortcut,
      ]),
    );

    expect(shortcuts).toMatchObject({
      "go-to-day": "d",
      "go-to-week": "w",
      "go-to-life": "l",
    });
  });

  it("omits the current view from navigation", () => {
    const labels = getNavigationCommandItems({
      currentView: "life",
      onNavigateToView: () => {},
    }).map((item) => item.label);

    expect(labels).toEqual(["Go to Day", "Go to Week"]);
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
