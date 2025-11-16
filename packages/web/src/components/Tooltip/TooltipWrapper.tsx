import React, { ReactNode, useState } from "react";
import { AlignItems } from "@web/components/Flex/styled";
import { Text } from "@web/components/Text";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@web/components/Tooltip";
import { Flex } from "../Flex";
import { TooltipDescription } from "./Description/TooltipDescription";
import { StyledShortcutTip } from "./styled";

export interface Props {
  children: ReactNode;
  description?: string;
  onClick?: () => void;
  shortcut?: string | ReactNode;
}

export const TooltipWrapper: React.FC<Props> = ({
  children,
  description,
  onClick = () => {},
  shortcut,
}) => {
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);

  return (
    <Tooltip open={isTooltipOpen} onOpenChange={setIsTooltipOpen}>
      <TooltipTrigger onClick={onClick}>{children}</TooltipTrigger>

      <TooltipContent className="Tooltip">
        <Flex alignItems={AlignItems.CENTER}>
          {description && <TooltipDescription description={description} />}
          {shortcut && (
            <StyledShortcutTip>
              {typeof shortcut === "string" ? (
                <Text size="s">{shortcut}</Text>
              ) : (
                shortcut
              )}
            </StyledShortcutTip>
          )}
        </Flex>
      </TooltipContent>
    </Tooltip>
  );
};
