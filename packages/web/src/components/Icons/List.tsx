import { type IconProps, List } from "@phosphor-icons/react";
import { getInteractiveIconClassName } from "./icon.utils";

export const ListIcon = ({ className, ...props }: IconProps) => (
  <List
    className={getInteractiveIconClassName(
      `cursor-pointer text-text-light ${className ?? ""}`,
    )}
    {...props}
  />
);
