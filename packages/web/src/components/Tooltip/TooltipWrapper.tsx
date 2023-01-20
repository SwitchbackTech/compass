import React, { ReactNode, useState } from "react";
import { Text } from "@web/components/Text";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@web/components/Tooltip";
import { AlignItems } from "@web/components/Flex/styled";

import { StyledShortcutTip } from "./styled";
import { Flex } from "../Flex";
import { TooltipDescription } from "./Description";

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
        <Flex alignItems={AlignItems.CENTER}>
          {description && <TooltipDescription description={description} />}
          {shortcut && (
            <StyledShortcutTip>
              <Text size={12}>{shortcut}</Text>
            </StyledShortcutTip>
          )}
        </Flex>
      </TooltipContent>
    </Tooltip>
  );
};
