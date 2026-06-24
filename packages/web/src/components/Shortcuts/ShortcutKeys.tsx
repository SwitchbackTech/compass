import classNames from "classnames";
import { ShortcutHint } from "@web/components/Shortcuts/ShortcutHint";
import { ShortCutLabel } from "./ShortcutLabel";

/** Aliases for keys users might write differently than the canonical token. */
const keyAliases: Record<string, string> = {
  cmd: "Meta",
  command: "Meta",
  ctrl: "Control",
};

/**
 * Normalizes a single key token for display: uppercases lone letters
 * (keyboard convention, `w` -> `W`) and resolves common aliases. Named tokens
 * (`Shift`, `Enter`, `Mod`, `Arrow*`) pass through to `ShortCutLabel`.
 */
function normalizeKeyToken(key: string): string {
  const alias = keyAliases[key.toLowerCase()];
  if (alias) return alias;
  if (key.length === 1 && /[a-z]/i.test(key)) return key.toUpperCase();
  return key;
}

interface Props {
  /** A `+`-joined combo, e.g. "Mod+K", "Shift+W", "Control+Meta+ArrowRight". */
  combo: string;
  title?: string;
  className?: string;
}

/**
 * Renders a keyboard shortcut as one keycap chip per key, so multi-step combos
 * read as distinct keys (`[⌘] [K]`) rather than a single `"+"`-joined string.
 */
export function ShortcutKeys({ combo, title, className }: Props) {
  const keys = combo
    .split("+")
    .map((key) => key.trim())
    .filter(Boolean);

  // Nothing to render -> emit nothing, rather than an empty chip row.
  if (keys.length === 0) return null;

  return (
    <span
      title={title}
      className={classNames("inline-flex items-center gap-1", className)}
    >
      {keys.map((key) => (
        <ShortcutHint key={key} variant="keycap">
          <ShortCutLabel k={normalizeKeyToken(key)} size={13} />
        </ShortcutHint>
      ))}
    </span>
  );
}
