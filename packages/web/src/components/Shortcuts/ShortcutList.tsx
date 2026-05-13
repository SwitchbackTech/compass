import { type Shortcut } from "@web/common/types/global.shortcut.types";
import {
  expandModInShortcutDisplay,
  ShortCutLabel,
} from "@web/common/utils/shortcut/shortcut.util";
import { ShortcutHint } from "@web/components/Shortcuts/ShortcutHint";

function ShortcutKeySequence({ shortcutKey }: { shortcutKey: string }) {
  const keys = expandModInShortcutDisplay(shortcutKey).split("+");

  return keys.map((key, idx) => {
    const trimmedKey = key.trim();
    const isLastKey = idx === keys.length - 1;

    return (
      <span key={trimmedKey} className="inline-flex items-center gap-1">
        <ShortCutLabel k={trimmedKey} />
        {isLastKey ? null : (
          <span className="text-text-light-inactive"> + </span>
        )}
      </span>
    );
  });
}

export const ShortcutList = ({ shortcuts }: { shortcuts: Shortcut[] }) => {
  if (!shortcuts.length) return null;

  return (
    <ul className="space-y-1.5">
      {shortcuts.map((it) => (
        <li
          key={it.k}
          className="flex min-h-9 items-center justify-between gap-4 rounded-default py-1.5 text-[13px] text-text-lighter leading-tight"
        >
          <span className="min-w-0 flex-1 break-words">{it.label}</span>
          <ShortcutHint
            className="shrink-0 whitespace-nowrap border border-border-primary bg-panel-bg px-1.5 py-0.5 font-medium text-[11px] text-text-light-inactive"
            variant="keycap"
          >
            <ShortcutKeySequence shortcutKey={it.k} />
          </ShortcutHint>
        </li>
      ))}
    </ul>
  );
};
