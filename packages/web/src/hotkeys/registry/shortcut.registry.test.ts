import {
  SHORTCUTS,
  type ShortcutDef,
  ShortcutTags,
} from "@web/hotkeys/registry/shortcut.registry";

describe("shortcut.registry", () => {
  describe("SHORTCUTS", () => {
    it("every entry has a non-empty hotkey, display, label, and at least one tag", () => {
      for (const [id, def] of Object.entries(SHORTCUTS) as [
        string,
        ShortcutDef,
      ][]) {
        expect(`${id}.hotkey:${def.hotkey}`).not.toBe(`${id}.hotkey:`);
        expect(`${id}.display:${def.display}`).not.toBe(`${id}.display:`);
        expect(`${id}.label:${def.label}`).not.toBe(`${id}.label:`);
        expect(def.tags.length).toBeGreaterThan(0);
      }
    });

    it("every tag value is a valid ShortcutTag", () => {
      const validTags = new Set(Object.values(ShortcutTags));

      for (const [id, def] of Object.entries(SHORTCUTS) as [
        string,
        ShortcutDef,
      ][]) {
        for (const tag of def.tags) {
          expect(`${id} tag "${tag}" valid:${validTags.has(tag)}`).toBe(
            `${id} tag "${tag}" valid:true`,
          );
        }
      }
    });

    it("sequence entries have uppercase string elements", () => {
      for (const [id, def] of Object.entries(SHORTCUTS) as [
        string,
        ShortcutDef,
      ][]) {
        if (!def.sequence) continue;

        expect(def.sequence.length).toBeGreaterThan(1);

        for (const key of def.sequence) {
          expect(
            `${id} sequence key "${key}" uppercase:${key === key.toUpperCase()}`,
          ).toBe(`${id} sequence key "${key}" uppercase:true`);
        }
      }
    });

    it("sequence entries end with their registered hotkey", () => {
      for (const [id, def] of Object.entries(SHORTCUTS) as [
        string,
        ShortcutDef,
      ][]) {
        if (!def.sequence) continue;

        expect(def.sequence.at(-1)).toBe(def.hotkey);
      }
    });
  });
});
