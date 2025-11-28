import { CommandIcon, ControlIcon } from "@phosphor-icons/react";
import { Shortcut } from "@web/common/types/global.shortcut.types";
import { ShortCutLabel } from "@web/common/utils/shortcut/shortcut.util";
import { ShortcutHint } from "@web/components/Shortcuts/ShortcutHint";

const keyIconMap: Record<string, React.ReactNode> = {
  Meta: <CommandIcon key="meta" size={14} data-testid="meta-icon" />,
  Control: <ControlIcon key="control" size={14} data-testid="control-icon" />,
};

export const ShortcutList = ({ shortcuts }: { shortcuts: Shortcut[] }) => {
  if (!shortcuts.length) return null;

  return (
    <ul className="space-y-1">
      {shortcuts.map((it) => (
        <li
          key={it.k}
          className="text-text-lighter flex items-center gap-2 text-xs"
        >
          <ShortcutHint>
            <ShortCutLabel k={it.k} />
          </ShortcutHint>
          <span className="truncate">{it.label}</span>
        </li>
      ))}
    </ul>
  );
};
