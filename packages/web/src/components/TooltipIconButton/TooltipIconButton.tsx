import React, { ReactNode } from "react";
import IconButton from "@web/components/IconButton/IconButton";
import {
  Props as TooltipProps,
  TooltipWrapper,
} from "@web/components/Tooltip/TooltipWrapper";

export interface Props {
  tooltipProps: Omit<TooltipProps, "children">;
  buttonProps: Omit<Parameters<typeof IconButton>[0], "children">;
  icon?: ReactNode;
  /** Overrides the default icon button and injects whatever component you want instead */
  component?: React.ReactElement;
}

const TooltipIconButton: React.FC<Props> = ({
  tooltipProps,
  buttonProps,
  icon,
  component,
}: Props) => {
  if (!component && !icon) {
    throw new Error("Either icon or component must be provided");
  }

  return (
    <TooltipWrapper {...tooltipProps}>
      {component ? (
        component
      ) : (
        <IconButton {...buttonProps} type="button">
          {icon}
        </IconButton>
      )}
    </TooltipWrapper>
  );
};

export default TooltipIconButton;
