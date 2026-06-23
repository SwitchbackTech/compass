import { type IconProps, Sidebar } from "@phosphor-icons/react";
import { getInteractiveIconClassName } from "./icon.utils";

export const SidebarIcon = ({ className, ...props }: IconProps) => (
  <Sidebar className={getInteractiveIconClassName(className)} {...props} />
);
