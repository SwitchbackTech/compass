import classNames from "classnames";
import { forwardRef, type HTMLAttributes, type PropsWithChildren } from "react";
import { Priorities, type Priority } from "@core/constants/core.constants";
import { brighten, darken } from "@core/util/color.utils";
import { type CSSVariables } from "@web/common/styles/css.types";
import { colorByPriority } from "@web/common/styles/theme.util";

export const Btn = forwardRef<
  HTMLDivElement,
  PropsWithChildren<HTMLAttributes<HTMLDivElement>>
>(({ className, ...props }, ref) => (
  <div
    {...props}
    className={classNames(
      "flex cursor-pointer items-center justify-center rounded-[2px]",
      className,
    )}
    ref={ref}
  />
));

Btn.displayName = "Btn";

export interface PriorityButtonProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "color"> {
  color?: string;
  bordered?: boolean;
  border?: string;
}

export const PriorityButton = forwardRef<
  HTMLDivElement,
  PropsWithChildren<PriorityButtonProps>
>(({ border, bordered, className, color, style, ...props }, ref) => {
  const buttonStyle: CSSVariables = {
    ...style,
    "--priority-button-color": color,
    "--priority-button-hover-color": color ? brighten(color) : undefined,
    border:
      border ??
      (bordered ? "2px solid var(--color-border-primary-dark)" : undefined),
  };

  return (
    <Btn
      {...props}
      className={classNames(
        "min-w-[158px] px-2 text-text-dark transition-[background-color,color,box-shadow,transform] duration-500 hover:bg-bg-primary hover:text-(--priority-button-hover-color)",
        className,
      )}
      ref={ref}
      style={buttonStyle}
    />
  );
});

PriorityButton.displayName = "PriorityButton";

interface SaveButtonProps extends PriorityButtonProps {
  priority: Priority;
  minWidth: number;
  disabled?: boolean;
}

export const SaveButton = forwardRef<
  HTMLDivElement,
  PropsWithChildren<SaveButtonProps>
>(({ className, disabled, minWidth, priority, style, ...props }, ref) => {
  const background = darken(colorByPriority[priority]);
  const hoverColor =
    priority === Priorities.UNASSIGNED
      ? "var(--color-text-light)"
      : brighten(colorByPriority[priority]);
  const buttonStyle: CSSVariables = {
    ...style,
    "--priority-button-hover-color": hoverColor,
    "--elevated-shadow-color": darken(colorByPriority[priority], 25),
    background,
    minWidth,
  };

  return (
    <PriorityButton
      {...props}
      aria-disabled={disabled || undefined}
      className={classNames(
        "c-button-elevated text-text-dark focus:border-2 focus:border-border-primary-dark",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
      ref={ref}
      style={buttonStyle}
    />
  );
});

SaveButton.displayName = "SaveButton";
