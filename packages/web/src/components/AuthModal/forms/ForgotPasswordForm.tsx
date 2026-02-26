import {
  ChangeEvent,
  FC,
  FormEvent,
  useCallback,
  useMemo,
  useState,
} from "react";
import {
  ForgotPasswordFormData,
  forgotPasswordSchema,
} from "@web/auth/schemas/auth.schemas";
import { AuthButton } from "../components/AuthButton";
import { AuthInput } from "../components/AuthInput";

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
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string>();
  const [isSubmitted, setIsSubmitted] = useState(false);

  const validateEmail = useCallback((value: string): string | undefined => {
    const result = forgotPasswordSchema.safeParse({ email: value });
    if (!result.success) {
      return result.error.errors[0]?.message;
    }
    return undefined;
  }, []);

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setEmail(value);

      if (touched) {
        setError(validateEmail(value));
      }
    },
    [touched, validateEmail],
  );

  const handleBlur = useCallback(() => {
    setTouched(true);
    setError(validateEmail(email));
  }, [email, validateEmail]);

  const isValid = useMemo(() => {
    const result = forgotPasswordSchema.safeParse({ email });
    return result.success;
  }, [email]);

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      setTouched(true);

      const result = forgotPasswordSchema.safeParse({ email });
      if (result.success) {
        onSubmit(result.data);
        setIsSubmitted(true);
      } else {
        setError(result.error.errors[0]?.message);
      }
    },
    [email, onSubmit],
  );

  // Show success state after submission
  if (isSubmitted) {
    return (
      <div className="flex w-full flex-col gap-4 text-center">
        <div className="text-text-lighter">
          <p className="mb-2 text-base font-medium">Check your email</p>
          <p className="text-text-light text-sm">
            If an account exists for {email}, you will receive a password reset
            link shortly.
          </p>
        </div>
        <AuthButton type="button" variant="secondary" onClick={onBackToSignIn}>
          Back to sign in
        </AuthButton>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
      <p className="text-text-light text-center text-sm">
        Enter your email address and we&apos;ll send you a link to reset your
        password.
      </p>

      <AuthInput
        type="email"
        placeholder="Email"
        ariaLabel="Email"
        value={email}
        onChange={handleChange}
        onBlur={handleBlur}
        error={error}
        hasError={touched && !!error}
        autoComplete="email"
      />

      <AuthButton type="submit" disabled={!isValid} isLoading={isSubmitting}>
        Send reset link
      </AuthButton>

      <AuthButton type="button" variant="link" onClick={onBackToSignIn}>
        Back to sign in
      </AuthButton>
    </form>
  );
};
