import { CommandIcon, WindowsLogoIcon } from "@phosphor-icons/react";
import { DesktopOS, getDesktopOS } from "@web/common/utils/device/device.util";

export const getMetaKey = ({ size = 14 }: { size?: number } = {}) => {
  const desktopOS = getDesktopOS();
  const isMacOS = desktopOS === DesktopOS.MacOS;

  return isMacOS ? (
    <CommandIcon size={size} data-testid="macos-meta-icon" />
  ) : (
    <WindowsLogoIcon size={size} data-testid="windows-meta-icon" />
  );
};

export const getMetaKeyText = () => {
  const desktopOS = getDesktopOS();

  switch (desktopOS) {
    case DesktopOS.MacOS:
      return "⌘";
    case DesktopOS.Windows:
      return "⊞";
    default:
      return "Meta";
  }
};
