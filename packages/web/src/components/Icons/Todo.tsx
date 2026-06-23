import { CheckCircle, type IconProps } from "@phosphor-icons/react";
import { getInteractiveIconClassName } from "./icon.utils";

export const TodoIcon = ({ className, ...props }: IconProps) => (
  <CheckCircle className={getInteractiveIconClassName(className)} {...props} />
);
