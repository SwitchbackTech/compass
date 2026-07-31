import { getShortcutMenuSections } from "@web/shortcuts/data/shortcuts.data";

describe("shortcuts.data", () => {
  describe("getShortcutMenuSections", () => {
    it("returns the same action-based sections for both views", () => {
      const dayIds = getShortcutMenuSections({
        view: "day",
        isViewingCurrentPeriod: true,
      }).map((section) => section.id);
      const weekIds = getShortcutMenuSections({
        view: "week",
        isViewingCurrentPeriod: true,
      }).map((section) => section.id);

      expect(dayIds).toEqual(["navigate", "create", "focus", "edit", "other"]);
      expect(weekIds).toEqual(dayIds);
    });

    it("labels navigation with the view's period", () => {
      const [navigate] = getShortcutMenuSections({
        view: "week",
        isViewingCurrentPeriod: false,
      });

      expect(navigate.shortcuts).toContainEqual({
        keys: ["j"],
        label: "Previous week",
      });
      expect(navigate.shortcuts).toContainEqual({
        keys: ["k"],
        label: "Next week",
      });
      expect(navigate.shortcuts).toContainEqual({
        keys: ["d"],
        label: "Go to Day view",
      });
      expect(navigate.shortcuts).not.toContainEqual({
        keys: ["w"],
        label: "Go to Week view",
      });

      const [dayNavigate] = getShortcutMenuSections({
        view: "day",
        isViewingCurrentPeriod: false,
      });
      expect(dayNavigate.shortcuts).not.toContainEqual({
        keys: ["d"],
        label: "Go to Day view",
      });
      expect(dayNavigate.shortcuts).toContainEqual({
        keys: ["w"],
        label: "Go to Week view",
      });
    });

    it("keeps Life shortcuts focused on navigation and shell controls", () => {
      const sections = getShortcutMenuSections({
        view: "life",
        isViewingCurrentPeriod: true,
      });

      expect(sections.map((section) => section.id)).toEqual([
        "navigate",
        "other",
      ]);
      expect(sections[0]?.shortcuts).toEqual([
        { keys: ["j"], label: "Previous life variation" },
        { keys: ["k"], label: "Next life variation" },
        { keys: ["t"], label: "Focus current week" },
        { keys: ["d"], label: "Go to Day view" },
        { keys: ["w"], label: "Go to Week view" },
      ]);
    });

    it("lists the Up Next shortcut in both views", () => {
      for (const view of ["day", "week"] as const) {
        const [navigate] = getShortcutMenuSections({
          view,
          isViewingCurrentPeriod: true,
        });

        expect(navigate.shortcuts).toContainEqual({
          keys: ["n"],
          label: "Open Up Next event",
        });
      }
    });

    it.each([
      ["day", true, "Scroll to now"],
      ["day", false, "Go to today"],
      ["week", true, "Scroll to now"],
      ["week", false, "Go to current week"],
    ] as const)("labels 't' for %s view when isViewingCurrentPeriod=%p", (view, isViewingCurrentPeriod, label) => {
      const [navigate] = getShortcutMenuSections({
        view,
        isViewingCurrentPeriod,
      });

      expect(navigate.shortcuts).toContainEqual({ keys: ["t"], label });
    });

    it("includes the all-day event shortcut in both views' Create section", () => {
      const findCreate = (view: "day" | "week") =>
        getShortcutMenuSections({ view, isViewingCurrentPeriod: true }).find(
          (section) => section.id === "create",
        );

      expect(findCreate("day")?.shortcuts).toContainEqual({
        keys: ["a"],
        label: "Create all-day event",
      });
      expect(findCreate("week")?.shortcuts).toContainEqual({
        keys: ["a"],
        label: "Create all-day event",
      });
    });

    it("lists u/i focus shortcuts per view", () => {
      const findFocus = (view: "day" | "week") =>
        getShortcutMenuSections({ view, isViewingCurrentPeriod: true }).find(
          (section) => section.id === "focus",
        );

      expect(findFocus("day")?.shortcuts).toEqual([
        { keys: ["i"], label: "Focus sidebar" },
        { keys: ["u"], label: "Focus calendar event" },
      ]);
      expect(findFocus("week")?.shortcuts).toEqual([
        { keys: ["i"], label: "Focus sidebar" },
        { keys: ["u"], label: "Focus calendar event" },
      ]);
    });

    it("includes Delete in the day and week Edit sections", () => {
      for (const view of ["day", "week"] as const) {
        const edit = getShortcutMenuSections({
          view,
          isViewingCurrentPeriod: true,
        }).find((section) => section.id === "edit");

        expect(edit?.shortcuts).toContainEqual({
          keys: ["Delete"],
          label: "Delete focused event",
        });
        expect(edit?.shortcuts).toContainEqual({
          keys: ["Mod", "D"],
          label: "Duplicate focused event",
        });
        expect(edit?.shortcuts).toContainEqual({
          keys: ["ArrowUp"],
          label: "Focus previous event",
        });
        expect(edit?.shortcuts).toContainEqual({
          keys: ["ArrowDown"],
          label: "Focus next event",
        });
        expect(edit?.shortcuts).toContainEqual({
          keys: ["Enter"],
          label: "Open focused event",
        });
      }
    });

    it("lists Life and undo/redo in day/week navigate and other sections", () => {
      const sections = getShortcutMenuSections({
        view: "day",
        isViewingCurrentPeriod: true,
      });
      const navigate = sections.find((section) => section.id === "navigate");
      const other = sections.find((section) => section.id === "other");

      expect(navigate?.shortcuts).toContainEqual({
        keys: ["l"],
        label: "Go to Life view",
      });
      expect(other?.shortcuts).toContainEqual({
        keys: ["Mod", "Z"],
        label: "Undo last change",
      });
      expect(other?.shortcuts).toContainEqual({
        keys: ["Mod", "Shift", "Z"],
        label: "Redo last change",
      });
    });

    it("lists Shift+Arrow reschedule shortcuts in the day and week Edit sections", () => {
      for (const view of ["day", "week"] as const) {
        const edit = getShortcutMenuSections({
          view,
          isViewingCurrentPeriod: true,
        }).find((section) => section.id === "edit");

        expect(edit?.shortcuts).toContainEqual({
          keys: ["Shift", "ArrowLeft"],
          label: "Move event to previous day",
        });
        expect(edit?.shortcuts).toContainEqual({
          keys: ["Shift", "ArrowRight"],
          label: "Move event to next day",
        });
        expect(edit?.shortcuts).toContainEqual({
          keys: ["Shift", "ArrowUp"],
          label: "Move event 15 min earlier",
        });
        expect(edit?.shortcuts).toContainEqual({
          keys: ["Arrow keys"],
          label: "Move draft event",
        });
      }
    });

    it("labels the Other section with a sidebar toggle", () => {
      const other = getShortcutMenuSections({
        view: "day",
        isViewingCurrentPeriod: true,
      }).find((section) => section.id === "other");

      expect(other?.title).toBe("Other");
      expect(other?.shortcuts).toContainEqual({
        keys: ["]"],
        label: "Toggle sidebar",
      });
    });
  });
});
