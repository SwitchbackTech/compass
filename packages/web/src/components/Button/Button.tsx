import classNames from "classnames";
import { forwardRef, type HTMLAttributes, type PropsWithChildren } from "react";
import { darken } from "@web/common/styles/color.utils";
import { type CSSVariables } from "@web/common/styles/css.types";
import { EVENT_COLOR } from "@web/common/styles/theme.util";

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

interface SaveButtonProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "color"> {
  minWidth: number;
  disabled?: boolean;
}

export const SaveButton = forwardRef<
  HTMLDivElement,
  PropsWithChildren<SaveButtonProps>
>(({ className, disabled, minWidth, style, ...props }, ref) => {
  const background = darken(EVENT_COLOR);
  const buttonStyle: CSSVariables = {
    ...style,
    "--save-button-hover-color": "var(--color-text-light)",
    "--elevated-shadow-color": darken(EVENT_COLOR, 25),
    background,
    minWidth,
  };

  return (
    <Btn
      {...props}
      aria-disabled={disabled || undefined}
      className={classNames(
        "c-button-elevated min-w-[158px] px-2 text-text-dark transition-[background-color,color,box-shadow,transform] duration-500 hover:bg-bg-primary hover:text-(--save-button-hover-color) focus:border-2 focus:border-border-primary-dark",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
      ref={ref}
      style={buttonStyle}
    />
  );
});

SaveButton.displayName = "SaveButton";
