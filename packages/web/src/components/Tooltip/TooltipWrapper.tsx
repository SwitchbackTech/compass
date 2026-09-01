import type React from "react";
import { isValidElement, type ReactNode } from "react";
import { ShortcutKeys } from "@web/components/Shortcuts/ShortcutKeys";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@web/components/Tooltip";
import { type TooltipOptions } from "@web/components/Tooltip/tooltip.types";
import { pointerShortcutAttributes } from "@web/shortcuts/keyboard-only/pointer-action";
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
  const pointerAttrs =
    typeof shortcut === "string" || Array.isArray(shortcut)
      ? pointerShortcutAttributes(shortcut)
      : {};
  const annotateChild = isValidElement(children);

  return (
    <Tooltip placement={placement}>
      <TooltipTrigger
        asChild={annotateChild}
        aria-disabled={disabled || undefined}
        onClick={disabled ? undefined : onClick}
        {...pointerAttrs}
      >
        {children}
      </TooltipTrigger>

      <TooltipContent>
        <div className="flex items-center">
          {description && <TooltipDescription description={description} />}
          {shortcut &&
            (typeof shortcut === "string" || Array.isArray(shortcut) ? (
              <ShortcutKeys keys={shortcut} />
            ) : (
              <ShortcutHint variant="keycap">{shortcut}</ShortcutHint>
            ))}
        </div>
      </TooltipContent>
    </Tooltip>
  );
};
