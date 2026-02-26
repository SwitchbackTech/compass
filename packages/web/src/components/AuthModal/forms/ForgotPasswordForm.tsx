import { FC, useState } from "react";
import {
  ForgotPasswordFormData,
  forgotPasswordSchema,
} from "@web/auth/schemas/auth.schemas";
import { AuthButton } from "../components/AuthButton";
import { AuthInput } from "../components/AuthInput";
import { useZodForm } from "../hooks/useZodForm";

interface ForgotPasswordFormProps {
  /** Callback when form is submitted with valid data */
  onSubmit: (data: ForgotPasswordFormData) => void;
  /** Callback when "Back to sign in" is clicked */
  onBackToSignIn: () => void;
  /** Whether form submission is in progress */
  isSubmitting?: boolean;
}

/**
 * Forgot password form with email field
 *
 * Shows a generic success message after submission to prevent
 * email enumeration attacks (always shows success, even if email not found)
 */
export const ForgotPasswordForm: FC<ForgotPasswordFormProps> = ({
  onSubmit,
  onBackToSignIn,
  isSubmitting,
}) => {
  const [isSubmitted, setIsSubmitted] = useState(false);

  const form = useZodForm({
    schema: forgotPasswordSchema,
    initialValues: { email: "" },
    onSubmit: (data) => {
      onSubmit(data);
      setIsSubmitted(true);
    },
  });

  if (isSubmitted) {
    return (
      <div className="flex w-full flex-col gap-4 text-center">
        <div className="text-text-lighter">
          <p className="mb-2 text-base font-medium">Check your email</p>
          <p className="text-text-light text-sm">
            If an account exists for {form.values.email}, you will receive a
            password reset link shortly.
          </p>
        </div>
        <AuthButton type="button" variant="secondary" onClick={onBackToSignIn}>
          Back to sign in
        </AuthButton>
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit} className="flex w-full flex-col gap-4">
      <p className="text-text-light text-center text-sm">
        Enter your email address and we&apos;ll send you a link to reset your
        password.
      </p>

      <AuthInput
        type="email"
        placeholder="Email"
        ariaLabel="Email"
        value={form.values.email}
        onChange={form.handleChange("email")}
        onBlur={form.handleBlur("email")}
        error={form.errors.email}
        hasError={!!form.touched.email && !!form.errors.email}
        autoComplete="email"
      />

      <AuthButton
        type="submit"
        disabled={!form.isValid}
        isLoading={isSubmitting}
      >
        Send reset link
      </AuthButton>

      <AuthButton type="button" variant="link" onClick={onBackToSignIn}>
        Back to sign in
      </AuthButton>
    </form>
  );
};
