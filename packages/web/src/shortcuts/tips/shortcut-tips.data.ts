export type ShortcutTipId =
  | "edit-sequence"
  | "nudge"
  | "target-event"
  | "edge-cycle";

export type ShortcutTip = {
  id: ShortcutTipId;
  text: string;
};

/** Small fixed rotation; content mirrors the onboarding tour's advanced lessons. */
export function getShortcutTips(): ShortcutTip[] {
  return [
    { id: "edit-sequence", text: "Press E then T to jump to the title" },
    { id: "nudge", text: "Hold Shift and press an arrow to nudge this event" },
    { id: "target-event", text: "Tap Shift to jump to any visible event" },
    { id: "edge-cycle", text: "Press Tab to move between start and end" },
  ];
}
