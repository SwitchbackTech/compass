/**
 * Shared bindings for the shortcuts the Shortcut Showcase teaches.
 *
 * Each entry pairs the runtime binding with the keycaps shown in hints so a
 * remap here propagates to the real handlers, the showcase, and its hint
 * chips in one edit. Bindings come in three shapes because the app has three
 * dispatch styles: tanstack hotkey strings, the bespoke `e`… sequence engine,
 * and bare-letter capture listeners (`s`, `h`).
 *
 * Only taught bindings live here — this is not a registry of every shortcut.
 * `shortcuts.registry.ts` remains the display list for the help overlay;
 * `keymap.test.ts` keeps the two from drifting apart.
 */
export const KEYMAP = {
  createEvent: { hotkey: "C", keycaps: ["C"] },
  saveDraft: { hotkey: "Enter", keycaps: ["Enter"] },
  moveFocus: {
    hotkeys: {
      up: "ArrowUp",
      down: "ArrowDown",
      left: "ArrowLeft",
      right: "ArrowRight",
    },
    keycaps: ["ArrowLeft", "ArrowUp", "ArrowDown", "ArrowRight"],
  },
  editTitle: { sequence: { leader: "e", second: "t" }, keycaps: ["E", "T"] },
  eventJump: { bareLetter: "s", keycaps: ["S"] },
  moveEvent: {
    hotkeys: {
      up: "Shift+ArrowUp",
      down: "Shift+ArrowDown",
      left: "Shift+ArrowLeft",
      right: "Shift+ArrowRight",
    },
    keycaps: ["Shift", "ArrowRight"],
  },
  edgeFocus: { hotkey: "Tab", keycaps: ["Tab"] },
  undo: { hotkey: "Mod+Z", keycaps: ["Mod", "Z"] },
  redo: { hotkey: "Mod+Shift+Z", keycaps: ["Mod", "Shift", "Z"] },
  hardcore: { bareLetter: "h", keycaps: ["H"] },
} as const;
