import React from "react";
import { ArrowDownFilledIcon } from "@web/assets/svg";
import { getColor } from "@core/util/color.utils";
import { ColorNames } from "@core/types/color.types";

export interface Props {
  isToggled?: boolean;
  onToggle?: () => void;
}

export const ToggleArrow: React.FC<Props> = ({
  isToggled = false,
  onToggle = () => {},
  ...props
}) => (
  <ArrowDownFilledIcon
    {...props}
    cursor="pointer"
    transform={!isToggled ? "rotate(-90)" : ""}
    onClick={onToggle}
    color={getColor(ColorNames.WHITE_1)}
  />
);
