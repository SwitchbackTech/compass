import dayjs from "@core/util/date/dayjs";
import { getShortcuts } from "./shortcuts.data";

describe("shortcuts.data", () => {
  describe("getShortcuts", () => {
    it("should return default shortcuts when no config provided", () => {
      const shortcuts = getShortcuts();

      expect(shortcuts.globalShortcuts).toHaveLength(3);
      expect(shortcuts.globalShortcuts[0]).toEqual({ k: "1", label: "Now" });
      expect(shortcuts.globalShortcuts[1]).toEqual({ k: "2", label: "Day" });
      expect(shortcuts.globalShortcuts[2]).toEqual({ k: "3", label: "Week" });

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
      const todayUTC = dayjs().startOf("day").utc();

      const shortcuts = getShortcuts({
        isToday: true,
        currentDate: todayUTC,
      });

      const tShortcut = shortcuts.dayAgendaShortcuts.find((s) => s.k === "t");
      expect(tShortcut).toBeDefined();
      expect(tShortcut?.label).toBe("Scroll to now");
    });

    it("should show 'Go to today' when currentDate is not today", () => {
      const yesterdayUTC = dayjs().subtract(1, "day").startOf("day").utc();

      const shortcuts = getShortcuts({
        isToday: true,
        currentDate: yesterdayUTC,
      });

      const tShortcut = shortcuts.dayAgendaShortcuts.find((s) => s.k === "t");
      expect(tShortcut).toBeDefined();
      expect(tShortcut?.label).toBe("Go to today");
    });

    it("should show 'Go to today' when currentDate is tomorrow", () => {
      const tomorrowUTC = dayjs().add(1, "day").startOf("day").utc();

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
      const todayUTC = dayjs().startOf("day").utc();

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
        label: "Mark complete",
      });
      expect(shortcuts.nowShortcuts[3]).toEqual({
        k: "Esc",
        label: "Back to Today",
      });

      expect(shortcuts.dayTaskShortcuts).toHaveLength(0);
      expect(shortcuts.dayAgendaShortcuts).toHaveLength(0);
    });
  });
});
