import {
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
import { DesktopOS, getDesktopOS } from "@web/common/utils/device/device.util";

const keyIconMap: Record<string, Icon> = {
  Meta: CommandIcon,
  Control: ControlIcon,
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

    return (
      <span key={key} data-testid={testId} style={{ fontSize: `${size}px` }}>
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

export const getModifierKeyIcon = ({ size = 14 }: { size?: number } = {}) => {
  const k = resolveModifier("Mod");

  return <ShortCutLabel k={k} size={size} />;
};

export const getMetaKeyIcon = ({ size = 14 }: { size?: number } = {}) => {
  const desktopOS = getDesktopOS();
  const testId = `${desktopOS?.toLowerCase()}-icon`;

  switch (desktopOS) {
    case DesktopOS.MacOS:
      return <CommandIcon size={size} data-testid={testId} />;
    case DesktopOS.Windows:
    default:
      return <WindowsLogoIcon size={size} data-testid={testId} />;
  }
};
