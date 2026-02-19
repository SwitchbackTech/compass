import {
  CommandIcon,
  ControlIcon,
  Icon,
  WindowsLogoIcon,
} from "@phosphor-icons/react";
import { DesktopOS, getDesktopOS } from "@web/common/utils/device/device.util";

const keyIconMap: Record<string, Icon> = {
  Meta: CommandIcon,
  Control: ControlIcon,
};

export function ShortCutLabel({ k, size = 14 }: { k: string; size?: number }) {
  return k.split("+").map((_key) => {
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

export const getModifierKey = () => {
  const desktopOS = getDesktopOS();

  switch (desktopOS) {
    case DesktopOS.MacOS:
      return "Meta";
    case DesktopOS.Windows:
    default:
      return "Control";
  }
};

/**
 * Get the user-friendly display name for the modifier key.
 * Maps internal key names to what users expect to see.
 */
export const getModifierKeyLabel = (): string => {
  const key = getModifierKey();
  return key === "Meta" ? "Cmd" : "Ctrl";
};

export const getModifierKeyTestId = () =>
  `${getModifierKey().toLowerCase()}-icon`;

export const getModifierKeyIcon = ({ size = 14 }: { size?: number } = {}) => {
  const k = getModifierKey();

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
