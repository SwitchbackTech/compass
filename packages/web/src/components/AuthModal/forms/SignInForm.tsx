import {
  ChangeEvent,
  FC,
  FormEvent,
  useCallback,
  useMemo,
  useState,
} from "react";
import { SignInFormData, signInSchema } from "@web/auth/schemas/auth.schemas";
import { AuthButton } from "../components/AuthButton";
import { AuthInput } from "../components/AuthInput";

interface SignInFormProps {
  /** Callback when form is submitted with valid data */
  onSubmit: (data: SignInFormData) => void;
  /** Callback when "Forgot password" is clicked */
  onForgotPassword: () => void;
  /** Whether form submission is in progress */
  isSubmitting?: boolean;
}

interface FormState {
  email: string;
  password: string;
}

interface FormErrors {
  email?: string;
  password?: string;
}

interface TouchedFields {
  email: boolean;
  password: boolean;
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
  const [formState, setFormState] = useState<FormState>({
    email: "",
    password: "",
  });

  const [touched, setTouched] = useState<TouchedFields>({
    email: false,
    password: false,
  });

  const [errors, setErrors] = useState<FormErrors>({});

  const validateField = useCallback(
    (field: keyof FormState, value: string): string | undefined => {
      const testData = { ...formState, [field]: value };
      const result = signInSchema.safeParse(testData);

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
    (field: keyof FormState) => (e: ChangeEvent<HTMLInputElement>) => {
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
    const result = signInSchema.safeParse(formState);
    return result.success;
  }, [formState]);

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();

      // Mark all fields as touched
      setTouched({ email: true, password: true });

      const result = signInSchema.safeParse(formState);
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
        type="email"
        placeholder="Email"
        ariaLabel="Email"
        value={formState.email}
        onChange={handleChange("email")}
        onBlur={handleBlur("email")}
        error={errors.email}
        hasError={touched.email && !!errors.email}
        autoComplete="email"
      />

      <AuthInput
        type="password"
        placeholder="Password"
        ariaLabel="Password"
        value={formState.password}
        onChange={handleChange("password")}
        onBlur={handleBlur("password")}
        error={errors.password}
        hasError={touched.password && !!errors.password}
        autoComplete="current-password"
      />

      <div className="flex justify-end">
        <AuthButton type="button" variant="link" onClick={onForgotPassword}>
          Forgot password?
        </AuthButton>
      </div>

      <AuthButton type="submit" disabled={!isValid} isLoading={isSubmitting}>
        Enter
      </AuthButton>
    </form>
  );
};
