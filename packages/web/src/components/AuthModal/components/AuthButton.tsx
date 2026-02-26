import clsx from "clsx";
import { ButtonHTMLAttributes, FC } from "react";

interface AuthButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual variant of the button */
  variant?: "primary" | "secondary" | "outline" | "link";
  /** Whether the button is in a loading state */
  isLoading?: boolean;
}

/**
 * Styled button component for auth forms
 *
 * Variants:
 * - primary: Solid accent color background (for CTAs)
 * - secondary: Subtle background (for secondary actions)
 * - outline: White background with dark border (matches Google button)
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
        "rounded-3xl text-sm font-medium transition-colors",
        "focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent focus:outline-none",
        isDisabled ? "cursor-not-allowed" : "cursor-pointer",
        {
          // Primary variant
          "bg-accent-primary focus:ring-accent-primary h-10 w-full px-4 text-white":
            variant === "primary",
          "hover:brightness-110": variant === "primary" && !isDisabled,
          "opacity-50": variant === "primary" && isDisabled,

          // Secondary variant
          "bg-bg-secondary text-text-lighter h-10 w-full px-4":
            variant === "secondary",
          "hover:bg-bg-tertiary": variant === "secondary" && !isDisabled,

          // Outline variant (white/black, matches Google button)
          "h-10 w-full border border-[#1f1f1f] bg-white px-4 text-[#1f1f1f]":
            variant === "outline",
          "hover:bg-[#f8f8f8]": variant === "outline" && !isDisabled,

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
