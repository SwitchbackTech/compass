import { getShortcutMenuSections } from "@web/common/shortcuts/data/shortcuts.data";

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
      expect(navigate.shortcuts).toContainEqual({
        keys: ["w"],
        label: "Go to Week view",
      });
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
        { keys: ["u"], label: "Focus tasks" },
        { keys: ["i"], label: "Focus calendar" },
      ]);
      expect(findFocus("week")?.shortcuts).toEqual([
        { keys: ["u"], label: "Focus sidebar" },
        { keys: ["i"], label: "Focus calendar event" },
      ]);
    });

    it("includes Delete in the week Edit section", () => {
      const edit = getShortcutMenuSections({
        view: "week",
        isViewingCurrentPeriod: true,
      }).find((section) => section.id === "edit");

      expect(edit?.shortcuts).toContainEqual({
        keys: ["Delete"],
        label: "Delete calendar event",
      });
    });

    it("lists Shift+Arrow reschedule shortcuts in the week Edit section", () => {
      const edit = getShortcutMenuSections({
        view: "week",
        isViewingCurrentPeriod: true,
      }).find((section) => section.id === "edit");

      expect(edit?.shortcuts).toContainEqual({
        keys: ["Shift", "ArrowLeft"],
        label: "Move event to previous day (or sidebar)",
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
        keys: ["Shift", "ArrowRight"],
        label: "Schedule someday event",
      });
    });

    it("lists Shift+Arrow task migration in the day Edit section", () => {
      const edit = getShortcutMenuSections({
        view: "day",
        isViewingCurrentPeriod: true,
      }).find((section) => section.id === "edit");

      expect(edit?.shortcuts).toContainEqual({
        keys: ["Shift", "ArrowRight"],
        label: "Migrate task forward",
      });
      expect(edit?.shortcuts).toContainEqual({
        keys: ["Shift", "ArrowLeft"],
        label: "Migrate task backward",
      });
      expect(edit?.shortcuts).toContainEqual({
        keys: ["Shift", "ArrowDown"],
        label: "Move event 15 min later",
      });
    });

    it("labels the Other section with a sidebar toggle", () => {
      const other = getShortcutMenuSections({
        view: "day",
        isViewingCurrentPeriod: true,
      }).find((section) => section.id === "other");

      expect(other?.title).toBe("Other");
      expect(other?.shortcuts).toContainEqual({
        keys: ["["],
        label: "Toggle sidebar",
      });
    });
  });
});
