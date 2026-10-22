import {
  APP_SHORTCUT_BINDINGS,
  REGISTRY_RUNTIME_KEY_SOURCES,
} from "@core/shortcuts/app-shortcut-bindings";
import {
  MOD_CHORD_MAX_KEYCAPS,
  MONTH_PICKER_CURRENT_KEYCAPS,
  MONTH_PICKER_NEXT_KEYCAPS,
  MONTH_PICKER_PREV_KEYCAPS,
} from "@core/shortcuts/binding-keycaps.constants";
import { SHORTCUTS_REGISTRY } from "@core/shortcuts/shortcuts.registry";
import { describe, expect, it } from "bun:test";

const LEGEND_MULTI_KEY_TOKENS = new Set([
  "Arrow keys",
  "1-9",
  "1130",
  "E",
  "T",
]);

describe("binding-keycaps.constants", () => {
  it("uses Mod+Alt+J/K/T for month picker navigation", () => {
    expect(MONTH_PICKER_PREV_KEYCAPS).toEqual(["Mod", "Alt", "j"]);
    expect(MONTH_PICKER_NEXT_KEYCAPS).toEqual(["Mod", "Alt", "k"]);
    expect(MONTH_PICKER_CURRENT_KEYCAPS).toEqual(["Mod", "Alt", "t"]);
    expect(APP_SHORTCUT_BINDINGS.navMonthPrev.hotkey).toBe("Mod+Alt+J");
    expect(APP_SHORTCUT_BINDINGS.navMonthNext.hotkey).toBe("Mod+Alt+K");
    expect(APP_SHORTCUT_BINDINGS.navMonthCurrent.hotkey).toBe("Mod+Alt+T");
  });

  it("keeps every Mod chord in the legend at or below the three-key cap", () => {
    for (const entry of SHORTCUTS_REGISTRY) {
      if (!entry.keys.includes("Mod")) continue;
      if (entry.keys.some((key) => LEGEND_MULTI_KEY_TOKENS.has(key))) continue;
      expect(entry.keys.length).toBeLessThanOrEqual(MOD_CHORD_MAX_KEYCAPS);
    }

    for (const keycaps of Object.values(REGISTRY_RUNTIME_KEY_SOURCES)) {
      if (!keycaps.includes("Mod")) continue;
      if (keycaps.some((key) => LEGEND_MULTI_KEY_TOKENS.has(key))) continue;
      expect(keycaps.length).toBeLessThanOrEqual(MOD_CHORD_MAX_KEYCAPS);
    }
  });
});
