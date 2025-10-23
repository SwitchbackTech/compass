import dayjs from "@core/util/date/dayjs";
import { getShortcuts } from "./shortcuts.data";

describe("shortcuts.data", () => {
  describe("getShortcuts", () => {
    it("should return default shortcuts when no config provided", () => {
      const shortcuts = getShortcuts();

      expect(shortcuts.global).toHaveLength(3);
      expect(shortcuts.global[0]).toEqual({ k: "1", label: "Now" });
      expect(shortcuts.global[1]).toEqual({ k: "2", label: "Day" });
      expect(shortcuts.global[2]).toEqual({ k: "3", label: "Week" });

      expect(shortcuts.dayAgendaShortcuts).toHaveLength(2);
      expect(shortcuts.dayAgendaShortcuts[0]).toEqual({
        k: "i",
        label: "Focus on calendar",
      });
      expect(shortcuts.dayAgendaShortcuts[1]).toEqual({
        k: "t",
        label: "Go to today",
      });
    });

    it("should show 'Scroll to now' when currentDate is today", () => {
      const today = dayjs();
      const todayUTC = dayjs.utc(today.format("YYYY-MM-DD"));

      const shortcuts = getShortcuts({
        isToday: true,
        currentDate: todayUTC,
      });

      const tShortcut = shortcuts.dayAgendaShortcuts.find((s) => s.k === "t");
      expect(tShortcut).toBeDefined();
      expect(tShortcut?.label).toBe("Scroll to now");
    });

    it("should show 'Go to today' when currentDate is not today", () => {
      const yesterday = dayjs().subtract(1, "day");
      const yesterdayUTC = dayjs.utc(yesterday.format("YYYY-MM-DD"));

      const shortcuts = getShortcuts({
        isToday: true,
        currentDate: yesterdayUTC,
      });

      const tShortcut = shortcuts.dayAgendaShortcuts.find((s) => s.k === "t");
      expect(tShortcut).toBeDefined();
      expect(tShortcut?.label).toBe("Go to today");
    });

    it("should show 'Go to today' when currentDate is tomorrow", () => {
      const tomorrow = dayjs().add(1, "day");
      const tomorrowUTC = dayjs.utc(tomorrow.format("YYYY-MM-DD"));

      const shortcuts = getShortcuts({
        isToday: true,
        currentDate: tomorrowUTC,
      });

      const tShortcut = shortcuts.dayAgendaShortcuts.find((s) => s.k === "t");
      expect(tShortcut).toBeDefined();
      expect(tShortcut?.label).toBe("Go to today");
    });

    it("should show 'Go to today' when currentDate is undefined", () => {
      const shortcuts = getShortcuts({
        isToday: true,
        currentDate: undefined,
      });

      const tShortcut = shortcuts.dayAgendaShortcuts.find((s) => s.k === "t");
      expect(tShortcut).toBeDefined();
      expect(tShortcut?.label).toBe("Go to today");
    });

    it("should handle timezone edge cases correctly", () => {
      // Test with a specific date that we know is today
      const today = dayjs();
      const todayUTC = dayjs.utc(today.format("YYYY-MM-DD"));

      const shortcuts = getShortcuts({
        isToday: true,
        currentDate: todayUTC,
      });

      const tShortcut = shortcuts.dayAgendaShortcuts.find((s) => s.k === "t");
      expect(tShortcut).toBeDefined();
      expect(tShortcut?.label).toBe("Scroll to now");
    });

    it("should return home shortcuts when isHome is true", () => {
      const shortcuts = getShortcuts({
        isHome: true,
        isToday: false,
        isNow: false,
      });

      expect(shortcuts.homeShortcuts).toHaveLength(3);
      expect(shortcuts.homeShortcuts[0]).toEqual({
        k: "j",
        label: "Previous day",
      });
      expect(shortcuts.homeShortcuts[1]).toEqual({ k: "k", label: "Next day" });
      expect(shortcuts.homeShortcuts[2]).toEqual({
        k: "Enter",
        label: "Go to Today",
      });

      expect(shortcuts.dayTaskShortcuts).toHaveLength(0);
      expect(shortcuts.dayAgendaShortcuts).toHaveLength(0);
    });

    it("should return now shortcuts when isNow is true", () => {
      const shortcuts = getShortcuts({
        isHome: false,
        isToday: false,
        isNow: true,
      });

      expect(shortcuts.nowShortcuts).toHaveLength(4);
      expect(shortcuts.nowShortcuts[0]).toEqual({
        k: "j",
        label: "Previous task",
      });
      expect(shortcuts.nowShortcuts[1]).toEqual({ k: "k", label: "Next task" });
      expect(shortcuts.nowShortcuts[2]).toEqual({
        k: "Enter",
        label: "Complete focused task",
      });
      expect(shortcuts.nowShortcuts[3]).toEqual({
        k: "Esc",
        label: "Back to Today",
      });

      expect(shortcuts.dayTaskShortcuts).toHaveLength(0);
      expect(shortcuts.dayAgendaShortcuts).toHaveLength(0);
    });

    it("should include all shortcuts in allShortcuts array", () => {
      const shortcuts = getShortcuts({
        isToday: true,
        currentDate: dayjs.utc(dayjs().format("YYYY-MM-DD")),
      });

      const expectedLength =
        shortcuts.global.length +
        shortcuts.homeShortcuts.length +
        shortcuts.dayTaskShortcuts.length +
        shortcuts.dayAgendaShortcuts.length +
        shortcuts.nowShortcuts.length;

      expect(shortcuts.allShortcuts).toHaveLength(expectedLength);
    });
  });
});
