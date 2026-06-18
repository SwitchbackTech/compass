import type React from "react";
import { type ReactNode } from "react";
import { AlignItems, Flex } from "@web/components/Flex/Flex";
import { Text } from "@web/components/Text/Text";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@web/components/Tooltip";
import { type TooltipOptions } from "@web/components/Tooltip/tooltip.types";
import { LegacyShortcutHint } from "../Shortcuts/ShortcutHint";
import { TooltipDescription } from "./Description/TooltipDescription";

export interface Props {
  children: ReactNode;
  description?: string;
  disabled?: boolean;
  onClick?: () => void;
  placement?: TooltipOptions["placement"];
  shortcut?: string | ReactNode;
}

export const TooltipWrapper: React.FC<Props> = ({
  children,
  description,
  disabled = false,
  onClick,
  placement,
  shortcut,
}) => {
  return (
    <Tooltip placement={placement}>
      <TooltipTrigger
        aria-disabled={disabled || undefined}
        onClick={disabled ? undefined : onClick}
      >
        {children}
      </TooltipTrigger>

      <TooltipContent
        className={`${description ? "bg-fg-primary" : ""} rounded p-1`}
      >
        <Flex alignItems={AlignItems.CENTER}>
          {description && <TooltipDescription description={description} />}
          {shortcut && (
            <LegacyShortcutHint>
              {typeof shortcut === "string" ? (
                <Text size="s">{shortcut}</Text>
              ) : (
                shortcut
              )}
            </LegacyShortcutHint>
          )}
        </Flex>
      </TooltipContent>
    </Tooltip>
  );
};
