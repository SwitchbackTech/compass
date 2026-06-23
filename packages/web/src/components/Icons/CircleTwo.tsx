import { type IconProps, NumberCircleTwo } from "@phosphor-icons/react";
import { getInteractiveIconClassName } from "./icon.utils";

export const CircleTwoIcon = ({ className, ...props }: IconProps) => (
  <NumberCircleTwo
    className={getInteractiveIconClassName(className)}
    {...props}
  />
);
