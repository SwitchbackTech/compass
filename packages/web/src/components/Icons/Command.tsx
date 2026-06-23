import { Command, type IconProps } from "@phosphor-icons/react";
import { getInteractiveIconClassName } from "./icon.utils";

export const CommandIcon = ({ className, ...props }: IconProps) => (
  <Command className={getInteractiveIconClassName(className)} {...props} />
);
