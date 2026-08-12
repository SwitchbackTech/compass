export type ShortcutTipId =
  | "edit-sequence"
  | "nudge"
  | "target-event"
  | "edge-cycle";

export type ShortcutTipPart = string | { key: string };

export type ShortcutTip = {
  id: ShortcutTipId;
  parts: ShortcutTipPart[];
};

export const getTipPlainText = (tip: ShortcutTip): string =>
  tip.parts
    .map((part) => (typeof part === "string" ? part : part.key))
    .join("");

/** Small fixed rotation; content mirrors the shortcut showcase's later lessons. */
export function getShortcutTips(): ShortcutTip[] {
  return [
    {
      id: "edit-sequence",
      parts: [
        "Press ",
        { key: "E" },
        " then ",
        { key: "T" },
        " to jump to the title",
      ],
    },
    {
      id: "nudge",
      parts: [
        "Hold ",
        { key: "Shift" },
        " and press an arrow to move this event",
      ],
    },
    {
      id: "target-event",
      parts: ["Tap ", { key: "S" }, " to jump to any visible event"],
    },
    {
      id: "edge-cycle",
      parts: ["Press ", { key: "Tab" }, " to move between start and end"],
    },
  ];
}
