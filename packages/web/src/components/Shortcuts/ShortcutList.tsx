import { type Shortcut } from "@web/common/types/global.shortcut.types";
import { ShortcutKeys } from "@web/components/Shortcuts/ShortcutKeys";

export const ShortcutList = ({ shortcuts }: { shortcuts: Shortcut[] }) => {
  if (!shortcuts.length) return null;

  return (
    <ul className="space-y-1.5">
      {shortcuts.map((it) => (
        // Key on combo + label: one key combo legitimately appears more than
        // once in a section (e.g. Shift+Arrow does one thing to a calendar
        // event and another to a Someday event), so the combo alone is not
        // unique and collides as a React key.
        <li
          key={`${it.keys.join("-")}-${it.label}`}
          className="flex min-h-9 items-center justify-between gap-4 rounded-default py-1.5 text-[13px] text-text-lighter leading-tight"
        >
          <span className="min-w-0 flex-1 break-words">{it.label}</span>
          <ShortcutKeys className="shrink-0" keys={it.keys} />
        </li>
      ))}
    </ul>
  );
};
