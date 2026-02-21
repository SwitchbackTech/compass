import clsx from "clsx";
import { InputHTMLAttributes, forwardRef, useId } from "react";

interface AuthInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "className"> {
  /** Label text displayed above the input */
  label: string;
  /** Error message to display below the input */
  error?: string;
  /** Whether the input is in an error state */
  hasError?: boolean;
}

/**
 * Styled input component for auth forms
 *
 * Features:
 * - Accessible label association via generated ID
 * - Error message display with proper aria attributes
 * - Tailwind styling consistent with app theme
 */
export const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(
  ({ label, error, hasError, ...inputProps }, ref) => {
    const generatedId = useId();
    const inputId = inputProps.id || generatedId;
    const errorId = `${inputId}-error`;
    const showError = hasError && error;

    return (
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={inputId}
          className="text-text-lighter text-sm font-medium"
        >
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          className={clsx(
            "bg-bg-secondary border-border-primary h-10 rounded-md border px-3 text-base transition-colors",
            "text-text-lighter placeholder:text-text-darkPlaceholder",
            "focus:border-accent-primary focus:outline-none",
            {
              "border-red-500 focus:border-red-500": showError,
            },
          )}
          aria-invalid={showError ? true : undefined}
          aria-describedby={showError ? errorId : undefined}
          {...inputProps}
        />
        {showError && (
          <span id={errorId} className="text-sm text-red-400" role="alert">
            {error}
          </span>
        )}
      </div>
    );
  },
);

AuthInput.displayName = "AuthInput";
