import { type IconProps, Repeat } from "@phosphor-icons/react";
import { getInteractiveIconClassName } from "./icon.utils";

export const RepeatIcon = ({ className, ...props }: IconProps) => (
  <Repeat className={getInteractiveIconClassName(className)} {...props} />
);
