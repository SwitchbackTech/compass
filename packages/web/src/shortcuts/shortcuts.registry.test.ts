import {
  filterShortcutsByContext,
  getShortcutsBySection,
} from "@web/shortcuts/shortcuts.registry";

describe("shortcuts.registry", () => {
  describe("filterShortcutsByContext", () => {
    it("filters out life-specific shortcuts in day view", () => {
      const shortcuts = filterShortcutsByContext({
        view: "day",
        isViewingCurrentPeriod: true,
      });

      const ids = shortcuts.map((s) => s.id);
      expect(ids).not.toContain("nav-life-prev");
      expect(ids).not.toContain("nav-life-next");
      expect(ids).not.toContain("nav-life-current");
    });

    it("includes only life-specific shortcuts in life view navigate section", () => {
      const shortcuts = filterShortcutsByContext({
        view: "life",
        isViewingCurrentPeriod: true,
      });

      const navigateIds = shortcuts
        .filter((s) => s.section === "navigate")
        .map((s) => s.id);

      expect(navigateIds).toContain("nav-life-prev");
      expect(navigateIds).toContain("nav-life-next");
      expect(navigateIds).toContain("nav-life-current");
      expect(navigateIds).toContain("nav-day-view");
      expect(navigateIds).toContain("nav-week-view");

      // Should not contain day/week specific shortcuts
      expect(navigateIds).not.toContain("nav-previous");
      expect(navigateIds).not.toContain("nav-next");
      expect(navigateIds).not.toContain("nav-shift-left");
      expect(navigateIds).not.toContain("nav-shift-right");
    });

    it("excludes form-open shortcuts when form is not open", () => {
      const shortcuts = filterShortcutsByContext({
        view: "day",
        isViewingCurrentPeriod: true,
        isFormOpen: false,
      });

      const ids = shortcuts.map((s) => s.id);
      expect(ids).not.toContain("edit-save");
    });

    it("includes form-open shortcuts when form is open", () => {
      const shortcuts = filterShortcutsByContext({
        view: "day",
        isViewingCurrentPeriod: true,
        isFormOpen: true,
      });

      const ids = shortcuts.map((s) => s.id);
      expect(ids).toContain("edit-save");
    });

    it("lists hold-Shift event jump keys in day and week focus sections", () => {
      for (const view of ["day", "week"] as const) {
        const shortcuts = filterShortcutsByContext({
          view,
          isViewingCurrentPeriod: true,
        });
        expect(shortcuts.map((shortcut) => shortcut.id)).toContain(
          "focus-shift-hold",
        );
      }

      const life = filterShortcutsByContext({
        view: "life",
        isViewingCurrentPeriod: true,
      }).map((shortcut) => shortcut.id);
      expect(life).not.toContain("focus-shift-hold");
    });

    it("hides event-focused edit sequences until an event is focused", () => {
      const idle = filterShortcutsByContext({
        view: "day",
        isViewingCurrentPeriod: true,
        eventFocused: false,
      }).map((shortcut) => shortcut.id);

      expect(idle).not.toContain("edit-focus-title");
      expect(idle).not.toContain("edit-focus-description");

      const focused = filterShortcutsByContext({
        view: "day",
        isViewingCurrentPeriod: true,
        eventFocused: true,
      }).map((shortcut) => shortcut.id);

      expect(focused).toContain("edit-focus-title");
      expect(focused).toContain("edit-focus-description");
      expect(focused).toContain("edit-focus-start");
      expect(focused).toContain("edit-focus-end");
      expect(focused).toContain("edit-focus-recurrence");
      expect(focused).toContain("edit-focus-calendar");
    });
  });

  describe("getShortcutsBySection", () => {
    it("groups shortcuts by section", () => {
      const shortcuts = filterShortcutsByContext({
        view: "day",
        isViewingCurrentPeriod: true,
      });

      const sections = getShortcutsBySection(shortcuts);

      expect(sections.navigate).toBeDefined();
      expect(sections.create).toBeDefined();
      expect(sections.focus).toBeDefined();
      expect(sections.edit).toBeDefined();
      expect(sections.other).toBeDefined();

      expect(sections.navigate.shortcuts.length).toBeGreaterThan(0);
      expect(sections.create.shortcuts.length).toBeGreaterThan(0);
      expect(sections.edit.shortcuts.length).toBeGreaterThan(0);
    });

    it("creates section title for each group", () => {
      const shortcuts = filterShortcutsByContext({
        view: "day",
        isViewingCurrentPeriod: true,
      });

      const sections = getShortcutsBySection(shortcuts);

      expect(sections.navigate.title).toBe("Navigate");
      expect(sections.create.title).toBe("Create");
      expect(sections.focus.title).toBe("Focus");
      expect(sections.edit.title).toBe("Edit");
      expect(sections.other.title).toBe("Other");
    });
  });
});
