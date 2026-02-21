import { FC, FormEvent, useCallback, useMemo, useState } from "react";
import { SignUpFormData, signUpSchema } from "@web/auth/schemas/auth.schemas";
import { AuthButton } from "../components/AuthButton";
import { AuthInput } from "../components/AuthInput";

interface SignUpFormProps {
  /** Callback when form is submitted with valid data */
  onSubmit: (data: SignUpFormData) => void;
  /** Whether form submission is in progress */
  isSubmitting?: boolean;
}

interface FormState {
  name: string;
  email: string;
  password: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
}

interface TouchedFields {
  name: boolean;
  email: boolean;
  password: boolean;
}

/**
 * Sign up form with name, email, and password fields
 *
 * Validates on blur and enables CTA only when all fields are valid
 */
export const SignUpForm: FC<SignUpFormProps> = ({ onSubmit, isSubmitting }) => {
  const [formState, setFormState] = useState<FormState>({
    name: "",
    email: "",
    password: "",
  });

  const [touched, setTouched] = useState<TouchedFields>({
    name: false,
    email: false,
    password: false,
  });

  const [errors, setErrors] = useState<FormErrors>({});

  const validateField = useCallback(
    (field: keyof FormState, value: string): string | undefined => {
      const testData = { ...formState, [field]: value };
      const result = signUpSchema.safeParse(testData);

      if (!result.success) {
        const fieldError = result.error.errors.find(
          (err) => err.path[0] === field,
        );
        return fieldError?.message;
      }
      return undefined;
    },
    [formState],
  );

  const handleChange = useCallback(
    (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setFormState((prev) => ({ ...prev, [field]: value }));

      // Clear error on change if field was touched
      if (touched[field]) {
        const error = validateField(field, value);
        setErrors((prev) => ({ ...prev, [field]: error }));
      }
    },
    [touched, validateField],
  );

  const handleBlur = useCallback(
    (field: keyof FormState) => () => {
      setTouched((prev) => ({ ...prev, [field]: true }));
      const error = validateField(field, formState[field]);
      setErrors((prev) => ({ ...prev, [field]: error }));
    },
    [formState, validateField],
  );

  const isValid = useMemo(() => {
    const result = signUpSchema.safeParse(formState);
    return result.success;
  }, [formState]);

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();

      // Mark all fields as touched
      setTouched({ name: true, email: true, password: true });

      const result = signUpSchema.safeParse(formState);
      if (result.success) {
        onSubmit(result.data);
      } else {
        // Set all errors
        const newErrors: FormErrors = {};
        result.error.errors.forEach((err) => {
          const field = err.path[0] as keyof FormErrors;
          if (!newErrors[field]) {
            newErrors[field] = err.message;
          }
        });
        setErrors(newErrors);
      }
    },
    [formState, onSubmit],
  );

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
      <AuthInput
        label="Name"
        type="text"
        placeholder="Enter your name"
        value={formState.name}
        onChange={handleChange("name")}
        onBlur={handleBlur("name")}
        error={errors.name}
        hasError={touched.name && !!errors.name}
        autoComplete="name"
      />

      <AuthInput
        label="Email"
        type="email"
        placeholder="Enter your email"
        value={formState.email}
        onChange={handleChange("email")}
        onBlur={handleBlur("email")}
        error={errors.email}
        hasError={touched.email && !!errors.email}
        autoComplete="email"
      />

      <AuthInput
        label="Password"
        type="password"
        placeholder="Create a password"
        value={formState.password}
        onChange={handleChange("password")}
        onBlur={handleBlur("password")}
        error={errors.password}
        hasError={touched.password && !!errors.password}
        autoComplete="new-password"
      />

      <AuthButton type="submit" disabled={!isValid} isLoading={isSubmitting}>
        Create account
      </AuthButton>
    </form>
  );
};
