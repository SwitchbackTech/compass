import {
  type BookingField,
  bookingJumpKeys,
} from "@web/booking/booking-sequence.fields";
import { ShortcutKeys } from "@web/components/Shortcuts/ShortcutKeys";

/**
 * A field caption with its hold-Mod chord, revealed alongside Settings nav.
 */
export function BookingFieldLabel({
  children,
  field,
  htmlFor,
  showShortcuts,
}: {
  children: string;
  field: BookingField;
  htmlFor?: string;
  showShortcuts: boolean;
}) {
  const chip = showShortcuts ? (
    <ShortcutKeys keys={bookingJumpKeys(field)} />
  ) : null;

  return htmlFor ? (
    <label
      className="mb-1 flex items-center gap-1 text-sm text-text"
      htmlFor={htmlFor}
    >
      {children}
      {chip}
    </label>
  ) : (
    <span className="mb-1 flex items-center gap-1 text-sm text-text">
      {children}
      {chip}
    </span>
  );
}
