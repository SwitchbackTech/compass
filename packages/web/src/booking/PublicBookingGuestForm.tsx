import { type FormEvent } from "react";
import { getBrowserTimeZone } from "@web/timezone/browser-timezone";

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
  values: PublicBookingGuestDetails;
  onChange: (values: PublicBookingGuestDetails) => void;
  onSubmit: (values: PublicBookingGuestFormValues) => void;
}

export function PublicBookingGuestForm({
  disabled,
  submitDisabled,
  showHeading = true,
  values,
  onChange,
  onSubmit,
}: PublicBookingGuestFormProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (disabled || submitDisabled) {
      return;
    }
    onSubmit({
      guestName: values.guestName.trim(),
      guestEmail: values.guestEmail.trim(),
      notes: values.notes.trim(),
      guestTimeZone: getBrowserTimeZone(),
    });
  };

  return (
    <form
      aria-labelledby="booking-form-heading"
      className="flex flex-col gap-4"
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
          required
          type="text"
          autoComplete="name"
          value={values.guestName}
          disabled={disabled}
          onChange={(event) =>
            onChange({ ...values, guestName: event.target.value })
          }
          className="rounded-md border border-border bg-surface px-3 py-2 text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-text-muted">Email</span>
        <input
          required
          type="email"
          autoComplete="email"
          value={values.guestEmail}
          disabled={disabled}
          onChange={(event) =>
            onChange({ ...values, guestEmail: event.target.value })
          }
          className="rounded-md border border-border bg-surface px-3 py-2 text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        />
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
          className="rounded-md border border-border bg-surface px-3 py-2 text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
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
