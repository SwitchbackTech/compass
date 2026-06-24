import type React from "react";
import { type ReactNode } from "react";
import { AlignItems, Flex } from "@web/components/Flex/Flex";
import { ShortcutKeys } from "@web/components/Shortcuts/ShortcutKeys";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@web/components/Tooltip";
import { type TooltipOptions } from "@web/components/Tooltip/tooltip.types";
import { ShortcutHint } from "../Shortcuts/ShortcutHint";
import { TooltipDescription } from "./Description/TooltipDescription";

export interface Props {
  children: ReactNode;
  description?: string;
  disabled?: boolean;
  onClick?: () => void;
  placement?: TooltipOptions["placement"];
  /** One key (`"?"`) or a combo as a key array (`["Mod", "K"]`); a custom node is rendered as-is. */
  shortcut?: string | string[] | ReactNode;
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

      <TooltipContent>
        <Flex alignItems={AlignItems.CENTER}>
          {description && <TooltipDescription description={description} />}
          {shortcut &&
            (typeof shortcut === "string" || Array.isArray(shortcut) ? (
              <ShortcutKeys keys={shortcut} />
            ) : (
              <ShortcutHint variant="keycap">{shortcut}</ShortcutHint>
            ))}
        </Flex>
      </TooltipContent>
    </Tooltip>
  );
};
