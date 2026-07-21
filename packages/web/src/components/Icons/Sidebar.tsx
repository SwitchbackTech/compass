import { type IconProps, SidebarSimpleIcon } from "@phosphor-icons/react";
import { getInteractiveIconClassName } from "./icon.utils";

// Mirrored so the panel glyph reads as sitting on the right, matching the
// sidebar's position in the layout.
export const SidebarIcon = ({ className, ...props }: IconProps) => (
  <SidebarSimpleIcon
    mirrored
    className={getInteractiveIconClassName(className)}
    {...props}
  />
);
