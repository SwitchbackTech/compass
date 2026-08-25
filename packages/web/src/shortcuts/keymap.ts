/**
 * Shared bindings for the shortcuts the Shortcut Showcase teaches.
 *
 * Each entry pairs the runtime binding with the keycaps shown in hints so a
 * remap here propagates to the real handlers, the showcase, and its hint
 * chips in one edit. Bindings come in four shapes because the app has four
 * dispatch styles: tanstack hotkey strings, the bespoke `e`… sequence engine,
 * bare-letter capture listeners (`s`, `f`, `m`), and the hold-Mod + digit-chord
 * engine (`jumpFormField`).
 *
 * Only taught bindings live here — this is not a registry of every shortcut.
 * `shortcuts.registry.ts` remains the display list for the help overlay; its
 * rows for these bindings derive from this table, so a remap here updates the
 * legend by construction.
 */
export const KEYMAP = {
  createEvent: { hotkey: "C", keycaps: ["C"] },
  saveDraft: { hotkey: "Enter", keycaps: ["Enter"] },
  jumpFormField: {
    holdModifier: "Mod",
    digits: ["1", "8"],
    keycaps: ["Mod", "1-8"],
  },
  // Same hold-Mod gesture outside the form: digits follow PAGE_JUMP_TARGETS
  // order (page-jump.targets.ts).
  jumpPageTarget: {
    holdModifier: "Mod",
    digits: ["1", "4"],
    keycaps: ["Mod", "1-4"],
  },
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
} as const;
