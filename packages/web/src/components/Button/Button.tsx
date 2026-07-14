import classNames from "classnames";
import {
  type ButtonHTMLAttributes,
  forwardRef,
  type PropsWithChildren,
} from "react";
import { darken } from "@web/common/styles/color.utils";
import { type CSSVariables } from "@web/common/styles/css.types";
import { EVENT_COLOR } from "@web/common/styles/theme.util";

// A native button (not a div) so Enter/Space activate it — click handlers
// often live on a wrapping TooltipTrigger div and rely on bubbling.
export const Btn = forwardRef<
  HTMLButtonElement,
  PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>>
>(({ className, type = "button", ...props }, ref) => (
  <button
    {...props}
    type={type}
    className={classNames(
      "c-focus-ring flex cursor-pointer items-center justify-center rounded-[2px]",
      className,
    )}
    ref={ref}
  />
));

Btn.displayName = "Btn";

interface SaveButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "color" | "disabled"> {
  minWidth: number;
  disabled?: boolean;
}

export const SaveButton = forwardRef<
  HTMLButtonElement,
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
        "c-button-elevated min-w-[158px] px-2 text-text-dark transition-[background-color,color,box-shadow,transform] duration-500 hover:bg-bg-primary hover:text-(--save-button-hover-color)",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
      ref={ref}
      style={buttonStyle}
    />
  );
});

SaveButton.displayName = "SaveButton";
