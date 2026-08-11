import { getShortcutMenuSections } from "@web/shortcuts/data/shortcuts.data";

const stripMetadata = (shortcuts: any[]) =>
  shortcuts.map(({ keys, label }) => ({ keys, label }));

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

      expect(stripMetadata(navigate.shortcuts)).toContainEqual({
        keys: ["j"],
        label: "Previous week",
      });
      expect(stripMetadata(navigate.shortcuts)).toContainEqual({
        keys: ["k"],
        label: "Next week",
      });
      expect(stripMetadata(navigate.shortcuts)).toContainEqual({
        keys: ["d"],
        label: "Go to Day view",
      });
      expect(stripMetadata(navigate.shortcuts)).not.toContainEqual({
        keys: ["w"],
        label: "Go to Week view",
      });

      const [dayNavigate] = getShortcutMenuSections({
        view: "day",
        isViewingCurrentPeriod: false,
      });
      expect(stripMetadata(dayNavigate.shortcuts)).not.toContainEqual({
        keys: ["d"],
        label: "Go to Day view",
      });
      expect(stripMetadata(dayNavigate.shortcuts)).toContainEqual({
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
      expect(stripMetadata(sections[0]?.shortcuts ?? [])).toEqual([
        { keys: ["j"], label: "Previous life variation" },
        { keys: ["k"], label: "Next life variation" },
        { keys: ["t"], label: "Focus current week" },
        { keys: ["d"], label: "Go to Day view" },
        { keys: ["w"], label: "Go to Week view" },
      ]);
    });

    it("lists the Up Next shortcuts in both views", () => {
      for (const view of ["day", "week"] as const) {
        const [navigate] = getShortcutMenuSections({
          view,
          isViewingCurrentPeriod: true,
        });

        expect(stripMetadata(navigate.shortcuts)).toContainEqual({
          keys: ["n"],
          label: "Open Up Next event",
        });
        expect(stripMetadata(navigate.shortcuts)).toContainEqual({
          keys: ["v"],
          label: "Join Up Next meeting",
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

      expect(stripMetadata(navigate.shortcuts)).toContainEqual({
        keys: ["t"],
        label,
      });
    });

    it("includes the all-day event shortcut in both views' Create section", () => {
      const findCreate = (view: "day" | "week") =>
        getShortcutMenuSections({ view, isViewingCurrentPeriod: true }).find(
          (section) => section.id === "create",
        );

      expect(stripMetadata(findCreate("day")?.shortcuts ?? [])).toContainEqual({
        keys: ["a"],
        label: "Create all-day event",
      });
      expect(stripMetadata(findCreate("week")?.shortcuts ?? [])).toContainEqual(
        {
          keys: ["a"],
          label: "Create all-day event",
        },
      );
      expect(stripMetadata(findCreate("day")?.shortcuts ?? [])).toContainEqual({
        keys: ["Shift", "Arrow keys"],
        label: "Place timed draft on grid",
      });
      expect(stripMetadata(findCreate("week")?.shortcuts ?? [])).toContainEqual(
        {
          keys: ["Shift", "Arrow keys"],
          label: "Place timed draft on grid",
        },
      );
    });

    it("lists u/i focus shortcuts per view", () => {
      const findFocus = (view: "day" | "week", eventFocused = false) =>
        getShortcutMenuSections({
          view,
          isViewingCurrentPeriod: true,
          eventFocused,
        }).find((section) => section.id === "focus");

      expect(stripMetadata(findFocus("day")?.shortcuts ?? [])).toEqual([
        { keys: ["i"], label: "Focus sidebar" },
        { keys: ["u"], label: "Focus calendar event" },
        { keys: ["s"], label: "Toggle event jump keys" },
      ]);
      expect(stripMetadata(findFocus("week")?.shortcuts ?? [])).toEqual([
        { keys: ["i"], label: "Focus sidebar" },
        { keys: ["u"], label: "Focus calendar event" },
        { keys: ["s"], label: "Toggle event jump keys" },
      ]);
      expect(stripMetadata(findFocus("week", true)?.shortcuts ?? [])).toEqual([
        { keys: ["i"], label: "Focus sidebar" },
        { keys: ["u"], label: "Focus calendar event" },
        { keys: ["s"], label: "Toggle event jump keys" },
      ]);
      expect(stripMetadata(findFocus("day", true)?.shortcuts ?? [])).toEqual([
        { keys: ["i"], label: "Focus sidebar" },
        { keys: ["u"], label: "Focus calendar event" },
        { keys: ["s"], label: "Toggle event jump keys" },
      ]);
    });

    it("includes Delete in the day and week Edit sections", () => {
      for (const view of ["day", "week"] as const) {
        const edit = getShortcutMenuSections({
          view,
          isViewingCurrentPeriod: true,
        }).find((section) => section.id === "edit");

        expect(stripMetadata(edit?.shortcuts ?? [])).toContainEqual({
          keys: ["Delete"],
          label: "Delete focused event",
        });
        expect(stripMetadata(edit?.shortcuts ?? [])).toContainEqual({
          keys: ["Mod", "D"],
          label: "Duplicate focused event",
        });
        expect(stripMetadata(edit?.shortcuts ?? [])).toContainEqual({
          keys: ["ArrowUp"],
          label:
            view === "week"
              ? "Focus previous event on day"
              : "Focus previous event",
        });
        expect(stripMetadata(edit?.shortcuts ?? [])).toContainEqual({
          keys: ["ArrowDown"],
          label:
            view === "week" ? "Focus next event on day" : "Focus next event",
        });
        expect(stripMetadata(edit?.shortcuts ?? [])).toContainEqual({
          keys: ["ArrowLeft"],
          label:
            view === "day"
              ? "Focus previous event"
              : "Focus event on previous day",
        });
        expect(stripMetadata(edit?.shortcuts ?? [])).toContainEqual({
          keys: ["ArrowRight"],
          label:
            view === "day" ? "Focus next event" : "Focus event on next day",
        });
        expect(stripMetadata(edit?.shortcuts ?? [])).toContainEqual({
          keys: ["Enter"],
          label: "Open focused event",
        });
      }
    });

    it("lists e-then-field edit sequences only when an event is focused", () => {
      for (const view of ["day", "week"] as const) {
        const idleEdit = getShortcutMenuSections({
          view,
          isViewingCurrentPeriod: true,
          eventFocused: false,
        }).find((section) => section.id === "edit");
        expect(stripMetadata(idleEdit?.shortcuts ?? [])).not.toContainEqual({
          keys: ["e", "t"],
          label: "Edit title",
        });

        const focusedEdit = getShortcutMenuSections({
          view,
          isViewingCurrentPeriod: true,
          eventFocused: true,
        }).find((section) => section.id === "edit");
        const shortcuts = stripMetadata(focusedEdit?.shortcuts ?? []);

        expect(shortcuts).toContainEqual({
          keys: ["e", "t"],
          label: "Edit title",
        });
        expect(shortcuts).toContainEqual({
          keys: ["e", "d"],
          label: "Edit description",
        });
        expect(shortcuts).toContainEqual({
          keys: ["e", "s"],
          label: "Edit start time",
        });
        expect(shortcuts).toContainEqual({
          keys: ["e", "e"],
          label: "Edit end time",
        });
        expect(shortcuts).toContainEqual({
          keys: ["e", "r"],
          label: "Edit recurrence",
        });
        expect(shortcuts).toContainEqual({
          keys: ["e", "c"],
          label: "Edit calendar",
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

      expect(stripMetadata(navigate?.shortcuts ?? [])).toContainEqual({
        keys: ["l"],
        label: "Go to Life view",
      });
      expect(stripMetadata(other?.shortcuts ?? [])).toContainEqual({
        keys: ["Mod", "Z"],
        label: "Undo last change",
      });
      expect(stripMetadata(other?.shortcuts ?? [])).toContainEqual({
        keys: ["h"],
        label: "Toggle Hardcore Mode",
      });
      expect(stripMetadata(other?.shortcuts ?? [])).toContainEqual({
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

        expect(stripMetadata(edit?.shortcuts ?? [])).toContainEqual({
          keys: ["Shift", "ArrowLeft"],
          label: "Move event to previous day",
        });
        expect(stripMetadata(edit?.shortcuts ?? [])).toContainEqual({
          keys: ["Shift", "ArrowRight"],
          label: "Move event to next day",
        });
        expect(stripMetadata(edit?.shortcuts ?? [])).toContainEqual({
          keys: ["Shift", "ArrowUp"],
          label: "Move event 15 min earlier",
        });
        expect(stripMetadata(edit?.shortcuts ?? [])).toContainEqual({
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
      expect(stripMetadata(other?.shortcuts ?? [])).toContainEqual({
        keys: ["]"],
        label: "Toggle sidebar",
      });
    });
  });
});
