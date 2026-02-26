import clsx from "clsx";
import { InputHTMLAttributes, forwardRef, useId } from "react";

interface AuthInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "className"> {
  /** Label text displayed above the input. Omit for placeholder-only style. */
  label?: string;
  /** Accessible name when label is hidden (required when label is omitted) */
  ariaLabel?: string;
  /** Error message to display below the input */
  error?: string;
  /** Whether the input is in an error state */
  hasError?: boolean;
}

/**
 * Styled input component for auth forms
 *
 * Features:
 * - Optional label (omit for placeholder-only style)
 * - Accessible via aria-label when label is hidden
 * - Error message display with proper aria attributes
 * - Tailwind styling consistent with app theme
 */
export const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(
  ({ label, ariaLabel, error, hasError, ...inputProps }, ref) => {
    const generatedId = useId();
    const inputId = inputProps.id || generatedId;
    const errorId = `${inputId}-error`;
    const showError = hasError && error;
    const showLabel = label != null;

    return (
      <div className="flex flex-col gap-1.5">
        {showLabel && (
          <label
            htmlFor={inputId}
            className="text-text-lighter text-sm font-medium"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={clsx(
            "border-border-primary border-b bg-transparent py-2 text-base transition-colors",
            "text-text-lighter placeholder:text-text-darkPlaceholder",
            "focus:border-accent-primary focus:outline-none",
            {
              "border-status-error focus:border-status-error": showError,
            },
          )}
          aria-label={!showLabel ? ariaLabel : undefined}
          aria-invalid={showError ? true : undefined}
          aria-describedby={showError ? errorId : undefined}
          {...inputProps}
        />
        {showError && (
          <span id={errorId} className="text-status-error text-sm" role="alert">
            {error}
          </span>
        )}
      </div>
    );
  },
);

AuthInput.displayName = "AuthInput";
