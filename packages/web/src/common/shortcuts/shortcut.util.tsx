import {
  detectPlatform,
  formatWithLabels,
  resolveModifier,
} from "@tanstack/react-hotkeys";

/** Resolves TanStack `Mod` tokens to `Meta` / `Control` for icons and labels. */
export function expandModInShortcutDisplay(k: string): string {
  const resolvedMod = resolveModifier("Mod");
  return k
    .split("+")
    .map((segment) => {
      const part = segment.trim();
      return part.toLowerCase() === "mod" ? resolvedMod : part;
    })
    .join("+");
}

/**
 * User-facing primary modifier label (Cmd on macOS, Ctrl on Windows/Linux).
 * Uses TanStack's labeled formatting for `Mod`.
 */
export const getModifierKeyLabel = (): string => {
  const platform = detectPlatform();
  return formatWithLabels("Mod+k", platform).split("+")[0] ?? "Ctrl";
};

export const getModifierKeyTestId = () =>
  `${resolveModifier("Mod").toLowerCase()}-icon`;
