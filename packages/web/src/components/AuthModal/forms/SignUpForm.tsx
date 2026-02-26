import { ChangeEvent, FC, useCallback } from "react";
import { SignUpFormData, signUpSchema } from "@web/auth/schemas/auth.schemas";
import { AuthButton } from "../components/AuthButton";
import { AuthInput } from "../components/AuthInput";
import { useZodForm } from "../hooks/useZodForm";

interface SignUpFormProps {
  /** Callback when form is submitted with valid data */
  onSubmit: (data: SignUpFormData) => void;
  /** Callback when name field changes (for dynamic greeting) */
  onNameChange?: (name: string) => void;
  /** Whether form submission is in progress */
  isSubmitting?: boolean;
}

/**
 * Sign up form with name, email, and password fields
 *
 * Validates on blur and enables CTA only when all fields are valid
 */
export const SignUpForm: FC<SignUpFormProps> = ({
  onSubmit,
  onNameChange,
  isSubmitting,
}) => {
  const form = useZodForm({
    schema: signUpSchema,
    initialValues: { name: "", email: "", password: "" },
    onSubmit,
  });

  const handleNameChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      form.handleChange("name")(e);
      onNameChange?.(e.target.value);
    },
    [form.handleChange, onNameChange],
  );

  return (
    <form onSubmit={form.handleSubmit} className="flex w-full flex-col gap-4">
      <AuthInput
        type="text"
        placeholder="Name"
        ariaLabel="Name"
        value={form.values.name}
        onChange={handleNameChange}
        onBlur={form.handleBlur("name")}
        error={form.errors.name}
        hasError={!!form.touched.name && !!form.errors.name}
        autoComplete="name"
      />

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
        autoComplete="new-password"
      />

      <AuthButton
        type="submit"
        disabled={!form.isValid}
        isLoading={isSubmitting}
      >
        Create account
      </AuthButton>
    </form>
  );
};
