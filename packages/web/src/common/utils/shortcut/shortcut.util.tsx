import React from "react";
import { Command, WindowsLogo } from "@phosphor-icons/react";
import { DesktopOS, getDesktopOS } from "@web/common/utils/device/device.util";

export const getMetaKey = ({ size = 14 }: { size?: number } = {}) => {
  const desktopOS = getDesktopOS();
  const isMacOS = desktopOS === DesktopOS.MacOS;

  return isMacOS ? <Command size={size} /> : <WindowsLogo size={size} />;
};
