import {
  type IconProps,
  RepeatIcon as PhosphorRepeatIcon,
} from "@phosphor-icons/react";
import { getInteractiveIconClassName } from "./icon.utils";

export const RepeatIcon = ({ className, ...props }: IconProps) => (
  <PhosphorRepeatIcon
    className={getInteractiveIconClassName(className)}
    {...props}
  />
);
