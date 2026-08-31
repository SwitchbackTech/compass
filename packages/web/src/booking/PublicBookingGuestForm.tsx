import { type FormEvent, useRef, useState } from "react";

export interface PublicBookingGuestDetails {
  guestName: string;
  guestEmail: string;
  notes: string;
}

export interface PublicBookingGuestFormValues
  extends PublicBookingGuestDetails {
  guestTimeZone: string;
}

interface PublicBookingGuestFormProps {
  disabled: boolean;
  submitDisabled: boolean;
  showHeading?: boolean;
  guestTimeZone: string;
  values: PublicBookingGuestDetails;
  onChange: (values: PublicBookingGuestDetails) => void;
  onSubmit: (values: PublicBookingGuestFormValues) => void;
}

interface GuestFieldErrors {
  guestName?: string;
  guestEmail?: string;
}

// Same shape the backend enforces; the real gate stays server-side.
const GUEST_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validateGuestFields = (
  values: PublicBookingGuestDetails,
): GuestFieldErrors => {
  const errors: GuestFieldErrors = {};
  if (!values.guestName.trim()) {
    errors.guestName = "Enter your name.";
  }
  if (!GUEST_EMAIL_PATTERN.test(values.guestEmail.trim())) {
    errors.guestEmail = "Enter a valid email address.";
  }
  return errors;
};

const FIELD_CLASS_NAME =
  "rounded-md border border-border bg-surface px-3 py-2 text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

const INVALID_FIELD_CLASS_NAME = `${FIELD_CLASS_NAME} border-error`;

export function PublicBookingGuestForm({
  disabled,
  submitDisabled,
  showHeading = true,
  guestTimeZone,
  values,
  onChange,
  onSubmit,
}: PublicBookingGuestFormProps) {
  const [errors, setErrors] = useState<GuestFieldErrors>({});
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (disabled || submitDisabled) {
      return;
    }
    // Validate the trimmed values: a whitespace-only name must be an inline
    // field error here, not a schema throw dressed up as a server failure.
    const nextErrors = validateGuestFields(values);
    setErrors(nextErrors);
    if (nextErrors.guestName) {
      nameRef.current?.focus();
      return;
    }
    if (nextErrors.guestEmail) {
      emailRef.current?.focus();
      return;
    }
    onSubmit({
      guestName: values.guestName.trim(),
      guestEmail: values.guestEmail.trim(),
      notes: values.notes.trim(),
      guestTimeZone,
    });
  };

  return (
    <form
      aria-labelledby="booking-form-heading"
      className="flex flex-col gap-4"
      noValidate
      onSubmit={handleSubmit}
    >
      {showHeading ? (
        <h2
          id="booking-form-heading"
          className="font-medium text-base text-text"
        >
          Your details
        </h2>
      ) : null}
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-text-muted">Name</span>
        <input
          ref={nameRef}
          required
          type="text"
          autoComplete="name"
          value={values.guestName}
          disabled={disabled}
          aria-invalid={errors.guestName ? true : undefined}
          aria-describedby={
            errors.guestName ? "booking-guest-name-error" : undefined
          }
          onChange={(event) => {
            onChange({ ...values, guestName: event.target.value });
            setErrors((current) => ({ ...current, guestName: undefined }));
          }}
          className={
            errors.guestName ? INVALID_FIELD_CLASS_NAME : FIELD_CLASS_NAME
          }
        />
        {errors.guestName ? (
          <span
            id="booking-guest-name-error"
            role="alert"
            className="text-error text-xs"
          >
            {errors.guestName}
          </span>
        ) : null}
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-text-muted">Email</span>
        <input
          ref={emailRef}
          required
          type="email"
          autoComplete="email"
          value={values.guestEmail}
          disabled={disabled}
          aria-invalid={errors.guestEmail ? true : undefined}
          aria-describedby={
            errors.guestEmail ? "booking-guest-email-error" : undefined
          }
          onChange={(event) => {
            onChange({ ...values, guestEmail: event.target.value });
            setErrors((current) => ({ ...current, guestEmail: undefined }));
          }}
          className={
            errors.guestEmail ? INVALID_FIELD_CLASS_NAME : FIELD_CLASS_NAME
          }
        />
        {errors.guestEmail ? (
          <span
            id="booking-guest-email-error"
            role="alert"
            className="text-error text-xs"
          >
            {errors.guestEmail}
          </span>
        ) : null}
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-text-muted">Notes (optional)</span>
        <textarea
          rows={3}
          value={values.notes}
          disabled={disabled}
          onChange={(event) =>
            onChange({ ...values, notes: event.target.value })
          }
          className={FIELD_CLASS_NAME}
        />
      </label>
      <button
        type="submit"
        disabled={disabled || submitDisabled}
        aria-busy={disabled || undefined}
        className="rounded-md bg-accent px-4 py-2 font-medium text-on-accent transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-60"
      >
        {disabled ? "Confirming..." : "Confirm booking"}
      </button>
    </form>
  );
}
