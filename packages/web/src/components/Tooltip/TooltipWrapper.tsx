import React, { ReactNode, useState } from "react";
import { Text } from "@web/components/Text";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@web/components/Tooltip";

import { StyledTooltip } from "./styled";

export interface Props {
  children: ReactNode;
  description?: string;
  onClick: () => void;
  shortcut?: string;
}

export const TooltipWrapper: React.FC<Props> = ({
  children,
  description,
  onClick,
  shortcut,
}) => {
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);

  return (
    <Tooltip open={isTooltipOpen} onOpenChange={setIsTooltipOpen}>
      <TooltipTrigger
        onClick={() => {
          setIsTooltipOpen((v) => !v);
          onClick();
        }}
      >
        {children}
      </TooltipTrigger>
      <TooltipContent className="Tooltip">
        {description && <Text size={9}>{description}</Text>}
        <StyledTooltip>{shortcut && <Text>{shortcut}</Text>}</StyledTooltip>
      </TooltipContent>
    </Tooltip>
  );
};
