import clsx from "clsx";
import { ButtonHTMLAttributes, FC } from "react";

interface AuthButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual variant of the button */
  variant?: "primary" | "secondary" | "link";
  /** Whether the button is in a loading state */
  isLoading?: boolean;
}

/**
 * Styled button component for auth forms
 *
 * Variants:
 * - primary: Solid accent color background (for CTAs)
 * - secondary: Subtle background (for secondary actions)
 * - link: Text-only style (for inline links like "Forgot password")
 */
export const AuthButton: FC<AuthButtonProps> = ({
  children,
  variant = "primary",
  isLoading,
  disabled,
  className,
  ...buttonProps
}) => {
  const isDisabled = disabled || isLoading;

  return (
    <button
      disabled={isDisabled}
      className={clsx(
        "rounded-md text-sm font-medium transition-colors",
        "focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent focus:outline-none",
        {
          // Primary variant
          "bg-accent-primary focus:ring-accent-primary h-10 w-full px-4 text-white":
            variant === "primary",
          "hover:brightness-110": variant === "primary" && !isDisabled,
          "cursor-not-allowed opacity-50": variant === "primary" && isDisabled,

          // Secondary variant
          "bg-bg-secondary text-text-lighter h-10 w-full px-4":
            variant === "secondary",
          "hover:bg-bg-tertiary": variant === "secondary" && !isDisabled,

          // Link variant
          "text-text-light hover:text-text-lighter px-0 py-0":
            variant === "link",
          "hover:underline": variant === "link" && !isDisabled,
        },
        className,
      )}
      {...buttonProps}
    >
      {isLoading ? "Loading..." : children}
    </button>
  );
};
