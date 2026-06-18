import { type IconProps, SpinnerGapIcon } from "@phosphor-icons/react";
import { getInteractiveIconClassName } from "./icon.utils";

export const SpinnerIcon = ({ className, ...props }: IconProps) => (
  <SpinnerGapIcon
    className={getInteractiveIconClassName(
      `animate-spinner-rotate ${className ?? ""}`,
    )}
    {...props}
  />
);
