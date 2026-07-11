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
import { detectPlatform } from "@tanstack/react-hotkeys";
import { expandModInShortcutDisplay } from "@web/shortcuts/shortcut.util";

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
      <span key={key} data-testid={testId}>
        {key}
      </span>
    );
  });
}
