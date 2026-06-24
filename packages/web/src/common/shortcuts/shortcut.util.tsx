import {
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  CommandIcon,
  ControlIcon,
  type Icon,
  WindowsLogoIcon,
} from "@phosphor-icons/react";
import {
  detectPlatform,
  formatWithLabels,
  resolveModifier,
} from "@tanstack/react-hotkeys";

// `Meta` is the platform "command" key: ⌘ on macOS, the Windows logo elsewhere.
const metaIcon: Icon =
  detectPlatform() === "mac" ? CommandIcon : WindowsLogoIcon;

const keyIconMap: Record<string, Icon> = {
  Meta: metaIcon,
  Control: ControlIcon,
  ArrowUp: ArrowUpIcon,
  ArrowDown: ArrowDownIcon,
  ArrowLeft: ArrowLeftIcon,
  ArrowRight: ArrowRightIcon,
};

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

export function ShortCutLabel({ k, size = 14 }: { k: string; size?: number }) {
  const display = expandModInShortcutDisplay(k);

  return display.split("+").map((_key) => {
    const key = _key.trim();
    const testId = `${key.toLowerCase()}-icon`;
    const IconComponent = keyIconMap[key];

    if (IconComponent) {
      return <IconComponent key={key} size={size} data-testid={testId} />;
    }

    // Text keys inherit the surrounding font size (e.g. the keycap chip's 11px)
    // so letters and modifier icons read consistently together.
    return (
      <span key={key} data-testid={testId}>
        {key}
      </span>
    );
  });
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
