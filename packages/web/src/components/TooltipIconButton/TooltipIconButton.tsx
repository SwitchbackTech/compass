import React, { ReactNode } from "react";
import IconButton from "@web/components/IconButton/IconButton";
import {
  Props as TooltipProps,
  TooltipWrapper,
} from "@web/components/Tooltip/TooltipWrapper";

export interface Props {
  tooltipProps: Omit<TooltipProps, "children">;
  buttonProps: Omit<Parameters<typeof IconButton>[0], "children">;
  icon: ReactNode;
}

const TooltipIconButton: React.FC<Props> = ({
  tooltipProps,
  buttonProps,
  icon,
}: Props) => {
  return (
    <TooltipWrapper {...tooltipProps}>
      <IconButton {...buttonProps} type="button" children={icon} />
    </TooltipWrapper>
  );
};

export default TooltipIconButton;
