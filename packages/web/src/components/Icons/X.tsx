import { type IconProps, X } from "@phosphor-icons/react";
import { getInteractiveIconClassName } from "./icon.utils";

export const XIcon = ({ className, ...props }: IconProps) => (
  <X
    className={getInteractiveIconClassName(className, "hover:brightness-150")}
    {...props}
  />
);
