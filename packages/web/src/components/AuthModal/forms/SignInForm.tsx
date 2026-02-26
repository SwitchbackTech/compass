import { FC } from "react";
import { SignInFormData, signInSchema } from "@web/auth/schemas/auth.schemas";
import { AuthButton } from "../components/AuthButton";
import { AuthInput } from "../components/AuthInput";
import { useZodForm } from "../hooks/useZodForm";

interface SignInFormProps {
  /** Callback when form is submitted with valid data */
  onSubmit: (data: SignInFormData) => void;
  /** Callback when "Forgot password" is clicked */
  onForgotPassword: () => void;
  /** Whether form submission is in progress */
  isSubmitting?: boolean;
}

/**
 * Sign in form with email and password fields
 *
 * Includes "Forgot password" link and validates on blur
 */
export const SignInForm: FC<SignInFormProps> = ({
  onSubmit,
  onForgotPassword,
  isSubmitting,
}) => {
  const form = useZodForm({
    schema: signInSchema,
    initialValues: { email: "", password: "" },
    onSubmit,
  });

  return (
    <form onSubmit={form.handleSubmit} className="flex w-full flex-col gap-4">
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

      <AuthInput
        type="password"
        placeholder="Password"
        ariaLabel="Password"
        value={form.values.password}
        onChange={form.handleChange("password")}
        onBlur={form.handleBlur("password")}
        error={form.errors.password}
        hasError={!!form.touched.password && !!form.errors.password}
        autoComplete="current-password"
      />

      <div className="flex justify-end">
        <AuthButton type="button" variant="link" onClick={onForgotPassword}>
          Forgot password?
        </AuthButton>
      </div>

      <AuthButton
        type="submit"
        disabled={!form.isValid}
        isLoading={isSubmitting}
      >
        Enter
      </AuthButton>
    </form>
  );
};
