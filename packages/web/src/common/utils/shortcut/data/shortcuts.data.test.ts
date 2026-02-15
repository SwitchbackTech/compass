import dayjs from "@core/util/date/dayjs";
import { getShortcuts } from "@web/common/utils/shortcut/data/shortcuts.data";
import { getModifierKey } from "@web/common/utils/shortcut/shortcut.util";

describe("shortcuts.data", () => {
  describe("getShortcuts", () => {
    it("should return default shortcuts when no config provided", () => {
      const shortcuts = getShortcuts();

      expect(shortcuts.globalShortcuts).toHaveLength(6);
      expect(shortcuts.globalShortcuts[0]).toEqual({ k: "n", label: "Now" });
      expect(shortcuts.globalShortcuts[1]).toEqual({ k: "d", label: "Day" });
      expect(shortcuts.globalShortcuts[2]).toEqual({ k: "w", label: "Week" });
      expect(shortcuts.globalShortcuts[3]).toEqual({
        k: "r",
        label: "Edit reminder",
      });
      expect(shortcuts.globalShortcuts[4]).toEqual({ k: "z", label: "Logout" });
      expect(shortcuts.globalShortcuts[5]).toEqual({
        k: `${getModifierKey()}+k`,
        label: "Command Palette",
      });

      expect(shortcuts.dayAgendaShortcuts).toHaveLength(2);
      expect(shortcuts.dayAgendaShortcuts[0]).toEqual({
        k: "i",
        label: "Focus on calendar",
      });
      expect(shortcuts.dayAgendaShortcuts[1]).toEqual({
        k: "m",
        label: "Edit event",
      });

      expect(shortcuts.dayShortcuts).toHaveLength(3);
      expect(shortcuts.dayShortcuts[2]).toEqual({
        k: "t",
        label: "Go to today",
      });
    });

    it("should show 'Scroll to now' when currentDate is today", () => {
      const shortcuts = getShortcuts({
        isToday: true,
        currentDate: dayjs(),
      });

      const tShortcut = shortcuts.dayShortcuts.find((s) => s.k === "t");
      expect(tShortcut).toBeDefined();
      expect(tShortcut?.label).toBe("Scroll to now");
    });

    it("should show 'Go to today' when currentDate is not today", () => {
      const yesterday = dayjs().subtract(1, "day");

      const shortcuts = getShortcuts({
        isToday: true,
        currentDate: yesterday,
      });

      const tShortcut = shortcuts.dayShortcuts.find((s) => s.k === "t");
      expect(tShortcut).toBeDefined();
      expect(tShortcut?.label).toBe("Go to today");
    });

    it("should show 'Go to today' when currentDate is tomorrow", () => {
      const tomorrow = dayjs().add(1, "day");

      const shortcuts = getShortcuts({
        isToday: true,
        currentDate: tomorrow,
      });

      const tShortcut = shortcuts.dayShortcuts.find((s) => s.k === "t");
      expect(tShortcut).toBeDefined();
      expect(tShortcut?.label).toBe("Go to today");
    });

    it("should show 'Go to today' when currentDate is undefined", () => {
      const shortcuts = getShortcuts({
        isToday: true,
        currentDate: undefined,
      });

      const tShortcut = shortcuts.dayShortcuts.find((s) => s.k === "t");
      expect(tShortcut).toBeDefined();
      expect(tShortcut?.label).toBe("Go to today");
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

      expect(shortcuts.nowShortcuts).toHaveLength(6);
      expect(shortcuts.nowShortcuts[0]).toEqual({
        k: "d",
        label: "Edit description",
      });
      expect(shortcuts.nowShortcuts[1]).toEqual({
        k: `${getModifierKey()}+Enter`,
        label: "Save description",
      });
      expect(shortcuts.nowShortcuts[2]).toEqual({
        k: "j",
        label: "Previous task",
      });
      expect(shortcuts.nowShortcuts[3]).toEqual({ k: "k", label: "Next task" });
      expect(shortcuts.nowShortcuts[4]).toEqual({
        k: "Enter",
        label: "Mark complete",
      });
      expect(shortcuts.nowShortcuts[5]).toEqual({
        k: "Esc",
        label: "Back to Today",
      });

      expect(shortcuts.dayTaskShortcuts).toHaveLength(0);
      expect(shortcuts.dayAgendaShortcuts).toHaveLength(0);
    });
  });
});
