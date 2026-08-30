import { type FormEvent, useState } from "react";
import { getBrowserTimeZone } from "@web/timezone/browser-timezone";

export interface PublicBookingGuestFormValues {
  guestName: string;
  guestEmail: string;
  notes: string;
  guestTimeZone: string;
}

interface PublicBookingGuestFormProps {
  disabled: boolean;
  onSubmit: (values: PublicBookingGuestFormValues) => void;
}

export function PublicBookingGuestForm({
  disabled,
  onSubmit,
}: PublicBookingGuestFormProps) {
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit({
      guestName: guestName.trim(),
      guestEmail: guestEmail.trim(),
      notes: notes.trim(),
      guestTimeZone: getBrowserTimeZone(),
    });
  };

  return (
    <form
      aria-labelledby="booking-form-heading"
      className="flex flex-col gap-4"
      onSubmit={handleSubmit}
    >
      <h2 id="booking-form-heading" className="font-medium text-base text-text">
        Your details
      </h2>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-text-muted">Name</span>
        <input
          required
          type="text"
          autoComplete="name"
          value={guestName}
          disabled={disabled}
          onChange={(event) => setGuestName(event.target.value)}
          className="rounded-md border border-border bg-surface px-3 py-2 text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-text-muted">Email</span>
        <input
          required
          type="email"
          autoComplete="email"
          value={guestEmail}
          disabled={disabled}
          onChange={(event) => setGuestEmail(event.target.value)}
          className="rounded-md border border-border bg-surface px-3 py-2 text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-text-muted">Notes (optional)</span>
        <textarea
          rows={3}
          value={notes}
          disabled={disabled}
          onChange={(event) => setNotes(event.target.value)}
          className="rounded-md border border-border bg-surface px-3 py-2 text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        />
      </label>
      <button
        type="submit"
        disabled={disabled}
        className="rounded-md bg-accent px-4 py-2 font-medium text-on-accent transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-60"
      >
        Confirm booking
      </button>
    </form>
  );
}
