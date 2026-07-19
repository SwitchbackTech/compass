import classNames from "classnames";
import {
  type ButtonHTMLAttributes,
  forwardRef,
  type PropsWithChildren,
} from "react";
import { type CSSVariables } from "@web/common/styles/css.types";
import { theme } from "@web/common/styles/theme";
import { useEventPalette } from "@web/common/styles/theme.util";

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
      "c-focus-ring flex cursor-pointer items-center justify-center rounded-xs",
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
  // Per-theme, precomputed in theme.util — the hook subscription is what
  // repaints the button when the theme switches.
  const { saveButtonBg, saveButtonShadow } = useEventPalette();
  const buttonStyle: CSSVariables = {
    ...style,
    "--save-button-text-color": theme.getContrastText(saveButtonBg),
    "--save-button-hover-color": "var(--color-text-muted)",
    "--elevated-shadow-color": saveButtonShadow,
    background: saveButtonBg,
    minWidth,
  };

  return (
    <Btn
      {...props}
      aria-disabled={disabled || undefined}
      className={classNames(
        "c-button-elevated min-w-39.5 px-2 text-(--save-button-text-color) transition-[background-color,color,box-shadow,transform] duration-500 hover:bg-background hover:text-(--save-button-hover-color)",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
      ref={ref}
      style={buttonStyle}
    />
  );
});

SaveButton.displayName = "SaveButton";
