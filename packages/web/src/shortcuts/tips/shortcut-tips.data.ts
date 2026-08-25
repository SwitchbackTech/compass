import { expandModInShortcutDisplay } from "@web/shortcuts/shortcut.util";

export type ShortcutTipId =
  | "edit-sequence"
  | "nudge"
  | "target-event"
  | "edge-cycle"
  | "page-jump";

export type ShortcutTipPart =
  | string
  | { key: string }
  | { keys: readonly string[] };

export type ShortcutTip = {
  id: ShortcutTipId;
  parts: ShortcutTipPart[];
};

const spokenKey = (token: string): string => {
  const expanded = expandModInShortcutDisplay(token);
  if (expanded === "Meta") return "Cmd";
  if (expanded === "Control") return "Ctrl";
  return expanded;
};

const partPlainText = (part: ShortcutTipPart): string => {
  if (typeof part === "string") return part;
  const keys = "keys" in part ? part.keys : [part.key];
  return keys.map(spokenKey).join("+");
};

export const getPartsPlainText = (parts: readonly ShortcutTipPart[]): string =>
  parts.map(partPlainText).join("");

export const getTipPlainText = (tip: ShortcutTip): string =>
  getPartsPlainText(tip.parts);

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
    {
      id: "page-jump",
      parts: ["Hold ", { key: "Mod" }, " to see where you can jump next"],
    },
  ];
}
