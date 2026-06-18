import { ArrowsClockwiseIcon, type IconProps } from "@phosphor-icons/react";
import { getInteractiveIconClassName } from "./icon.utils";

export const RefreshIcon = ({ className, ...props }: IconProps) => (
  <ArrowsClockwiseIcon
    className={getInteractiveIconClassName(className)}
    {...props}
  />
);
