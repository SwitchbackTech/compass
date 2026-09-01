import type React from "react";
import {
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";
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
      : undefined;
  // Stamp the child, not the trigger. `asChild` would merge a ref onto
  // function-component children (IconButton) that do not forward refs, and
  // hover would never open. The wrapper trigger still owns hover/focus.
  const triggerChild =
    pointerAttrs && isValidElement(children)
      ? cloneElement(children as ReactElement, pointerAttrs)
      : children;

  return (
    <Tooltip placement={placement}>
      <TooltipTrigger
        aria-disabled={disabled || undefined}
        onClick={disabled ? undefined : onClick}
      >
        {triggerChild}
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
