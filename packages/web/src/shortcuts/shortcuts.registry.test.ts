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

    it("lists Shift event jump toggle in day and week focus sections", () => {
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

    it("lists h keyboard-only mode in every view's other section", () => {
      for (const view of ["day", "week", "life"] as const) {
        const ids = filterShortcutsByContext({
          view,
          isViewingCurrentPeriod: true,
        }).map((shortcut) => shortcut.id);
        expect(ids).toContain("other-keyboard-only");
      }
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
      expect(focused).toContain("edit-focus-location");
      expect(focused).toContain("edit-focus-description");
      expect(focused).toContain("edit-focus-start");
      expect(focused).toContain("edit-focus-end");
      expect(focused).toContain("edit-focus-recurrence");
      expect(focused).toContain("edit-focus-calendar");
    });

    it("excludes form-jump shortcuts when the form is closed and includes them when open", () => {
      const formJumpIds = [
        "form-jump-title",
        "form-jump-location",
        "form-jump-description",
        "form-jump-start",
        "form-jump-end",
        "form-jump-recurrence",
        "form-jump-calendar",
      ];

      const closed = filterShortcutsByContext({
        view: "day",
        isViewingCurrentPeriod: true,
        isFormOpen: false,
      }).map((shortcut) => shortcut.id);
      for (const id of formJumpIds) {
        expect(closed).not.toContain(id);
      }

      const open = filterShortcutsByContext({
        view: "day",
        isViewingCurrentPeriod: true,
        isFormOpen: true,
      }).map((shortcut) => shortcut.id);
      for (const id of formJumpIds) {
        expect(open).toContain(id);
      }
    });
  });

  describe("getShortcutsBySection", () => {
    it("groups non-empty sections by id, in display order, with shortcuts", () => {
      const shortcuts = filterShortcutsByContext({
        view: "day",
        isViewingCurrentPeriod: true,
      });

      const sections = getShortcutsBySection(shortcuts);
      const byId = Object.fromEntries(
        sections.map((section) => [section.id, section]),
      );

      expect(byId.navigate.shortcuts.length).toBeGreaterThan(0);
      expect(byId.create.shortcuts.length).toBeGreaterThan(0);
      expect(byId.edit.shortcuts.length).toBeGreaterThan(0);
      expect(sections.every((section) => section.shortcuts.length > 0)).toBe(
        true,
      );
    });

    it("sets a display title for each section", () => {
      const shortcuts = filterShortcutsByContext({
        view: "day",
        isViewingCurrentPeriod: true,
      });

      const byId = Object.fromEntries(
        getShortcutsBySection(shortcuts).map((section) => [
          section.id,
          section,
        ]),
      );

      expect(byId.navigate.title).toBe("Navigate");
      expect(byId.create.title).toBe("Create");
      expect(byId.edit.title).toBe("Edit");
    });
  });
});
