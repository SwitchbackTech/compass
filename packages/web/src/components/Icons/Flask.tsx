import { Flask, type IconProps } from "@phosphor-icons/react";
import { getInteractiveIconClassName } from "./icon.utils";

export const FlaskIcon = ({ className, ...props }: IconProps) => (
  <Flask className={getInteractiveIconClassName(className)} {...props} />
);
