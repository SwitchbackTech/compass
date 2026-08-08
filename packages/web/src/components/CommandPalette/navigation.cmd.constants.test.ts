import {
  type CommandPaletteViewName,
  getNavigationCommandItems,
} from "@web/components/CommandPalette/navigation.cmd.constants";
import {
  initialKeyboardOnlyState,
  useKeyboardOnlyStore,
} from "@web/shortcuts/keyboard-only/keyboard-only.store";
import { beforeEach, describe, expect, it } from "bun:test";

describe("getNavigationCommandItems", () => {
  const noopHandlers = {
    onGoToToday: () => {},
    onNavigateToView: () => {},
    onShowShortcuts: () => {},
  };

  it("lists Today first, then Day, Week, Life, then shortcuts and keyboard-only", () => {
    const labels = getNavigationCommandItems(noopHandlers).map(
      (item) => item.label,
    );
    expect(labels).toEqual([
      "Go to Today",
      "Go to Day",
      "Go to Week",
      "Go to Life",
      "Show shortcuts",
      "Enter keyboard-only mode",
    ]);
  });

  it("lists the onboarding tour restart next to the welcome guide", () => {
    const labels = getNavigationCommandItems({
      ...noopHandlers,
      onShowOnboardingTour: () => {},
      onShowWelcomeGuide: () => {},
    }).map((item) => item.label);

    expect(labels).toContain("Restart onboarding tour");
    expect(labels).toContain("Show welcome guide");
    expect(labels.indexOf("Restart onboarding tour")).toBeLessThan(
      labels.indexOf("Show welcome guide"),
    );
  });

  it("can list only view navigation for non-calendar surfaces", () => {
    const labels = getNavigationCommandItems({
      onNavigateToView: () => {},
    }).map((item) => item.label);

    expect(labels).toEqual([
      "Go to Day",
      "Go to Week",
      "Go to Life",
      "Enter keyboard-only mode",
    ]);
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

    expect(labels).toEqual([
      "Go to Day",
      "Go to Week",
      "Enter keyboard-only mode",
    ]);
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

  describe("enter-keyboard-only", () => {
    beforeEach(() => {
      useKeyboardOnlyStore.setState(initialKeyboardOnlyState);
    });

    it("enters keyboard-only mode on the next microtask", async () => {
      const items = getNavigationCommandItems({
        onNavigateToView: () => {},
      });
      items.find((item) => item.id === "enter-keyboard-only")?.onClick?.();

      expect(useKeyboardOnlyStore.getState().isActive).toBe(false);
      await Promise.resolve();
      expect(useKeyboardOnlyStore.getState().isActive).toBe(true);
    });

    it("advertises Shift Shift as the shortcut", () => {
      const item = getNavigationCommandItems({
        onNavigateToView: () => {},
      }).find((entry) => entry.id === "enter-keyboard-only");

      expect(item?.shortcut).toEqual(["Shift", "Shift"]);
    });
  });
});
