import { Shortcut } from "@web/common/types/global.shortcut.types";
import { ShortcutHint } from "./ShortcutHint";

export const ShortcutList = ({ shortcuts }: { shortcuts: Shortcut[] }) => {
  if (!shortcuts.length) return null;
  return (
    <ul className="space-y-1">
      {shortcuts.map((it) => (
        <li
          key={it.k}
          className="text-text-lighter flex items-center gap-2 text-xs"
        >
          <ShortcutHint>{it.k}</ShortcutHint>
          <span className="truncate">{it.label}</span>
        </li>
      ))}
    </ul>
  );
};
