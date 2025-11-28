import { CommandIcon, ControlIcon, Icon } from "@phosphor-icons/react";
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
      <span key={key} data-testid={testId} className={`font-${size}`}>
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

export const getModifierKeyTestId = () =>
  `${getModifierKey().toLowerCase()}-icon`;

export const getModifierKeyIcon = ({ size = 14 }: { size?: number } = {}) => {
  const k = getModifierKey();

  return <ShortCutLabel k={k} size={size} />;
};
