import { type FC } from "react";
import { ShortcutKeys } from "@web/components/Shortcuts/ShortcutKeys";
import { KEYMAP } from "@web/shortcuts/keymap";

const LEGEND_ROWS = [
  { keys: KEYMAP.createEvent.keycaps, label: "Create event" },
  { keys: KEYMAP.eventJump.keycaps, label: "Show event jump keys" },
  { keys: KEYMAP.moveEvent.keycaps, label: "Move focused event" },
  { keys: KEYMAP.edgeFocus.keycaps, label: "Cycle start or end" },
  { keys: KEYMAP.commandPalette.keycaps, label: "Command palette" },
] as const;

/**
 * Sandbox-only legend for the showcase `?` level. The real overlay stays
 * locked behind the takeover's app-lock; this list teaches the key without
 * dumping the full registry.
 */
export const PracticeLegend: FC = () => {
  return (
    <div
      role="dialog"
      aria-label="Practice shortcut legend"
      className="absolute inset-x-4 top-8 z-10 rounded-xl border border-border bg-surface-raised p-3 shadow-xl"
    >
      <p className="mb-2 text-text-muted text-xs">Shortcut legend</p>
      <ul className="flex flex-col gap-1">
        {LEGEND_ROWS.map((row) => (
          <li
            key={row.label}
            className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm text-text"
          >
            {row.label}
            <ShortcutKeys className="shrink-0" keys={[...row.keys]} />
          </li>
        ))}
      </ul>
    </div>
  );
};
