import { ShortcutKeys } from "@web/components/Shortcuts/ShortcutKeys";
import { type Shortcut } from "@web/shortcuts/global.shortcut.types";

export const ShortcutList = ({ shortcuts }: { shortcuts: Shortcut[] }) => {
  if (!shortcuts.length) return null;

  return (
    <ul className="space-y-1.5">
      {shortcuts.map((it) => (
        // Key on combo + label: a key combo can legitimately appear more than
        // once in a section, so the combo alone is not unique and collides as
        // a React key.
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
