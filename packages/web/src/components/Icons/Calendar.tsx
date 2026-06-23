import { CalendarDots, type IconProps } from "@phosphor-icons/react";
import { getInteractiveIconClassName } from "./icon.utils";

export const CalendarIcon = ({ className, ...props }: IconProps) => (
  <CalendarDots className={getInteractiveIconClassName(className)} {...props} />
);
